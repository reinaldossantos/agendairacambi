import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (value) => value ? format(parseISO(value), "dd/MM/yyyy") : "—";

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

export async function generateExpenseReportPDF(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const primary = [26, 59, 46];
  const items = (report.expense_items || []).filter((item) => item.description || Number(item.amount));
  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = Number(report.advance_amount || 0) - total;

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, width, 30, "F");
  doc.setDrawColor(...primary);
  doc.setLineWidth(1.2);
  doc.line(0, 30, width, 30);
  let titleX;
  try {
    const logo = await loadLogo();
    const logoHeight = 22;
    const logoWidth = Math.min(44, logoHeight * logo.ratio);
    doc.addImage(logo.data, "PNG", 14, 4, logoWidth, logoHeight);
    titleX = 14 + logoWidth + 7;
  } catch {
    doc.setTextColor(...primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("IRACAMBI", 14, 14);
    titleX = 52;
  }
  doc.setTextColor(...primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RELATÓRIO DE DESPESAS / ADIANTAMENTO", titleX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Prestação de contas — Iracambi", titleX, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Nº ${String(report.report_number || "RASCUNHO").padStart(5, "0")}`, width - 14, 25, { align: "right" });

  autoTable(doc, {
    startY: 35,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: primary },
    body: [
      ["Fonte pagadora", report.source_company || "—", "Código", report.company_code || "—"],
      ["Centro de custos", report.cost_center || "—", "Projeto", `${report.project_name || "—"}${report.project_code ? ` (${report.project_code})` : ""}`],
      ["Usuário", report.user_name || "—", "CPF", report.user_cpf || "—"],
      ["Telefone", report.user_phone || "—", "Cargo / Registro", `${report.user_role || "—"} / ${report.registration_number || "—"}`],
      ["Período", `${date(report.period_start)} a ${date(report.period_end)}`, "Roteiro", report.travel_route || "—"],
      [{ content: "Justificativa / objetivo", styles: { fontStyle: "bold" } }, { content: report.purpose || "—", colSpan: 3 }],
    ],
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    head: [["Item", "Descrição da despesa", "Data", "Documento", "Valor (R$)"]],
    body: items.length ? items.map((item, index) => [
      String(index + 1).padStart(2, "0"),
      item.mileage_quantity
        ? `${item.description} — ${item.mileage_quantity} km × ${money(item.mileage_rate)}/km (${item.vehicle_type === "motorcycle" ? "moto" : "carro"})`
        : item.description || "—",
      date(item.date),
      item.document_number || "—", money(item.amount),
    ]) : [["—", "Nenhuma despesa informada", "—", "—", money(0)]],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: primary },
    columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 24 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28, halign: "right" } },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    body: [
      ["Valor do adiantamento", money(report.advance_amount)],
      ["Despesa realizada", money(total)],
      [balance >= 0 ? "Saldo a devolver" : "Saldo a resgatar", money(Math.abs(balance))],
    ],
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right", fontStyle: "bold" } },
  });

  if (balance < 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      head: [["Dados bancários para ressarcimento", ""]],
      body: [
        ["Banco", report.bank_name || "—"],
        ["Forma de crédito", { checking: "Conta corrente", savings: "Conta poupança", check: "Cheque" }[report.payment_method] || "—"],
        ["Agência / Conta", `${report.bank_branch || "—"}-${report.bank_branch_digit || "—"} / ${report.bank_account || "—"}-${report.bank_account_digit || "—"}`],
      ],
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: primary },
    });
  }

  if (report.approvals?.length) {
    const decisionLabel = {
      pending: "Aguardando análise",
      approved: "Aprovado",
      changes_requested: "Ajustes solicitados",
      rejected: "Reprovado",
    };
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      head: [["Fluxo de aprovação", "Decisão", "Data", "Observação"]],
      body: report.approvals.map((approval) => [
        approval.approver?.name || "Aprovador",
        decisionLabel[approval.decision] || approval.decision,
        approval.decided_at ? format(parseISO(approval.decided_at), "dd/MM/yyyy 'às' HH:mm") : "—",
        approval.comment || "—",
      ]),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: primary },
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 34 }, 2: { cellWidth: 36 } },
    });
  }

  const signatureY = Math.max(doc.lastAutoTable.finalY + 14, 245);
  if (signatureY > 265) doc.addPage();
  const y = signatureY > 265 ? 35 : signatureY;
  doc.setDrawColor(80);
  doc.line(18, y, 92, y);
  doc.line(118, y, 192, y);
  doc.setTextColor(70);
  doc.setFontSize(8);
  doc.text("Data e assinatura do usuário", 55, y + 5, { align: "center" });
  doc.text("Conferência / Gestor administrativo", 155, y + 5, { align: "center" });
  doc.setFontSize(7);
  doc.text(`Gerado digitalmente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, width / 2, 287, { align: "center" });
  doc.save(`relatorio_despesas_${report.report_number || "rascunho"}.pdf`);
}
