import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { signFiles, storagePath } from "./privateStorage";
import { supabase } from "./supabaseClient";

const dateLabel = (value) => value ? format(parseISO(value), "dd/MM/yyyy") : "—";

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve({ data: canvas.toDataURL("image/png"), ratio: image.naturalWidth / image.naturalHeight });
    };
    image.onerror = reject;
    image.src = "/logo.webp";
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function evidenceDataUrl(value) {
  const path = storagePath(value, "activity-attachments");
  if (path) {
    const { data, error } = await supabase.storage.from("activity-attachments").download(path);
    if (error || !data) throw error || new Error("Evidência não encontrada.");
    return blobToDataUrl(data);
  }
  const url = typeof value === "string" ? value : value?.url;
  if (!url) throw new Error("Endereço da evidência ausente.");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar a evidência.");
  return blobToDataUrl(await response.blob());
}

async function loadEvidenceImage(value) {
  const source = await evidenceDataUrl(value);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDimension = 1600;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve({ data: canvas.toDataURL("image/jpeg", 0.82), ratio: canvas.width / canvas.height });
    };
    image.onerror = reject;
    image.src = source;
  });
}

export async function generateMonthlyReportPDF(report) {
  report = structuredClone(report);
  report.activity_snapshot = await Promise.all((report.activity_snapshot || []).map(async (activity) => ({ ...activity, files: await signFiles(activity.files || []) })));
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const primary = [26, 59, 46];
  let titleX = 14;
  try {
    const logo = await loadLogo();
    const height = 21;
    const width = Math.min(43, height * logo.ratio);
    doc.addImage(logo.data, "PNG", 14, 4, width, height);
    titleX += width + 7;
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...primary);
    doc.text("IRACAMBI", 14, 14);
    titleX = 52;
  }
  doc.setDrawColor(...primary);
  doc.setLineWidth(1.1);
  doc.line(0, 30, pageWidth, 30);
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELATÓRIO MENSAL DE ATIVIDADES", titleX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${report.report_type === "program" ? "Consolidado do programa" : "Relatório individual"} · Nº ${String(report.report_number || "RASCUNHO").padStart(5, "0")}`, titleX, 19);

  const month = format(parseISO(report.reference_month), "MMMM 'de' yyyy", { locale: ptBR });
  autoTable(doc, {
    startY: 35, theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: primary },
    body: [
      ["Programa", report.program_name, "Referência", month],
      ["Responsável", report.responsible_name, "Situação", report.status === "draft" ? "Rascunho" : report.status === "submitted" ? "Finalizado" : "Aprovado"],
      [{ content: "Equipe envolvida", styles: { fontStyle: "bold" } }, { content: (report.team_names || []).join(", ") || "—", colSpan: 3 }],
    ],
  });

  let nextY = doc.lastAutoTable.finalY;
  const section = (title, content) => {
    if (!content) return;
    autoTable(doc, { startY: nextY + 4, theme: "grid", head: [[title]], body: [[content]], styles: { fontSize: 8, cellPadding: 2.5 }, headStyles: { fillColor: primary } });
    nextY = doc.lastAutoTable.finalY;
  };
  section("Resumo executivo", report.executive_summary);

  const activities = (report.activity_snapshot || []).filter((item) => item.included !== false);
  const totalHours = activities.reduce((sum, item) => sum + Number(item.hours || 0), 0);
  const evidenceCount = (activity) => (activity.selected_images || activity.images || []).length + (activity.files || []).length;
  const evidenceLinkSources = new Map();
  autoTable(doc, {
    startY: nextY + 5,
    head: [["Data", "Atividade", "Objetivo / descrição", "Resultado", "Horas", "Evidências"]],
    body: activities.length ? activities.map((item) => [
      dateLabel(item.date), item.title || "—", item.objective || item.description || "—", item.result || item.status || "—",
      `${Number(item.hours || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} h`,
      evidenceCount(item) ? `${evidenceCount(item)} anexo(s)` : "—",
    ]) : [["—", "Nenhuma atividade selecionada", "—", "—", "—", "—"]],
    theme: "grid", styles: { fontSize: 7, cellPadding: 1.8 }, headStyles: { fillColor: primary },
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 34 }, 3: { cellWidth: 28 }, 4: { cellWidth: 15 }, 5: { cellWidth: 19, textColor: [37, 99, 166], fontStyle: "bold" } },
    didDrawCell: (cellData) => {
      if (cellData.section !== "body" || cellData.column.index !== 5) return;
      const activity = activities[cellData.row.index];
      if (!activity || !evidenceCount(activity)) return;
      evidenceLinkSources.set(activity, {
        pageNumber: doc.internal.getCurrentPageInfo().pageNumber,
        x: cellData.cell.x,
        y: cellData.cell.y,
        width: cellData.cell.width,
        height: cellData.cell.height,
      });
    },
  });
  nextY = doc.lastAutoTable.finalY;
  section("Carga horária total", `${totalHours.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} horas`);

  const activitiesWithEvidence = activities.filter((item) => evidenceCount(item));
  const failedImages = [];
  if (activitiesWithEvidence.length) {
    doc.addPage();
    let y = 18;
    const ensureSpace = (height) => {
      if (y + height > 280) {
        doc.addPage();
        y = 18;
      }
    };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primary);
    doc.text("EVIDÊNCIAS DAS ATIVIDADES", 14, y);
    y += 6;
    for (const activity of activitiesWithEvidence) {
      ensureSpace(14);
      const destinationPage = doc.internal.getCurrentPageInfo().pageNumber;
      const destinationY = y;
      const linkSource = evidenceLinkSources.get(activity);
      if (linkSource) {
        doc.setPage(linkSource.pageNumber);
        doc.link(linkSource.x, linkSource.y, linkSource.width, linkSource.height, { pageNumber: destinationPage, top: destinationY });
        doc.setPage(destinationPage);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...primary);
      doc.text(`${dateLabel(activity.date)} · ${activity.title || "Atividade"}`, 14, y, { maxWidth: 180 });
      y += 5;
      const selectedImages = activity.selected_images || activity.images || [];
      let column = 0;
      for (const url of selectedImages) {
        if (column === 0) ensureSpace(43);
        try {
          const image = await loadEvidenceImage(url);
          const frameWidth = 56;
          const frameHeight = 38;
          let imageWidth = frameWidth;
          let imageHeight = imageWidth / image.ratio;
          if (imageHeight > frameHeight) {
            imageHeight = frameHeight;
            imageWidth = imageHeight * image.ratio;
          }
          const frameX = 14 + (column * 61);
          const x = frameX + ((frameWidth - imageWidth) / 2);
          doc.addImage(image.data, "JPEG", x, y, imageWidth, imageHeight);
          doc.setDrawColor(210);
          doc.rect(frameX, y, frameWidth, frameHeight);
          column += 1;
          if (column === 3) {
            column = 0;
            y += 43;
          }
        } catch {
          failedImages.push(`${activity.title || "Atividade"} · foto ${selectedImages.indexOf(url) + 1}`);
          const frameX = 14 + (column * 61);
          const frameWidth = 56;
          const frameHeight = 38;
          doc.setDrawColor(210);
          doc.rect(frameX, y, frameWidth, frameHeight);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(100);
          doc.text("Evidência fotográfica não incorporada", frameX + 3, y + 7, { maxWidth: frameWidth - 6 });
          column += 1;
          if (column === 3) {
            column = 0;
            y += 43;
          }
        }
      }
      if (column > 0) y += 43;
      for (const [fileIndex, file] of (activity.files || []).entries()) {
        ensureSpace(6);
        const name = file.name || file.url?.split("/").pop() || `Arquivo ${fileIndex + 1}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(37, 99, 166);
        if (file.url) doc.textWithLink(`Documento: ${name}`, 16, y, { url: file.url });
        else doc.text(`Documento: ${name}`, 16, y);
        y += 5;
      }
      y += 3;
    }
    nextY = y;
  }

  const indicators = report.indicators || [];
  if (indicators.length) autoTable(doc, {
    startY: nextY + 5, head: [["Indicador", "Resultado", "Unidade", "Meta / comparação", "Observação"]],
    body: indicators.map((item) => [item.name, item.value, item.unit || "—", item.comparison || "—", item.note || "—"]),
    theme: "grid", styles: { fontSize: 7.5, cellPadding: 2 }, headStyles: { fillColor: primary },
  });
  if (indicators.length) nextY = doc.lastAutoTable.finalY;
  section("Destaques do mês", report.highlights);
  section("Dificuldades e pendências", report.challenges);
  section("Planejamento do mês seguinte", report.next_month_plan);

  if (failedImages.length) {
    throw new Error(`Não foi possível incorporar ${failedImages.length} foto(s): ${failedImages.slice(0, 3).join("; ")}. Verifique os arquivos e tente novamente`);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`Iracambi · Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Página ${page}/${pages}`, pageWidth / 2, 290, { align: "center" });
  }
  doc.save(`relatorio_mensal_${report.program_name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_${report.reference_month.slice(0, 7)}.pdf`);
}
