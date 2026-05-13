import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

async function getLogoBase64() {
  try {
    const response = await fetch("/logo.webp");
    if (!response.ok) throw new Error("Logo não encontrado");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateWeeklyPDF({ weekStart, weekEnd, activities }) {
  const logoBase64 = await getLogoBase64();

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Cores
  const primaryColor = [26, 59, 46]; // #1a3b2e

  // Faixa verde no topo
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 30, "F");

  // Logo ou fallback
  if (logoBase64) {
    doc.addImage(logoBase64, "WEBP", 10, 5, 18, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Semanal de Atividades", 32, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Colegiado IRACAMBI®", 32, 21);
  } else {
    // Fallback: desenha um retângulo e texto
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, 5, 20, 20, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text("IRACAMBI", 12, 17);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Relatório Semanal de Atividades", 35, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Colegiado IRACAMBI®", 35, 21);
  }

  // Período
  const startFormatted = format(parseISO(weekStart), "dd 'de' MMMM", { locale: ptBR });
  const endFormatted = format(parseISO(weekEnd), "dd 'de' MMMM", { locale: ptBR });
  doc.setFontSize(10);
  doc.text(`Período: ${startFormatted} – ${endFormatted}`, logoBase64 ? 32 : 35, 28);

  // Data de emissão
  const hoje = format(new Date(), "dd/MM/yyyy 'às' HH:mm");
  doc.setFontSize(8);
  doc.text(`Emitido em: ${hoje}`, pageWidth - 60, 8);
  doc.text(`Total de atividades: ${activities.length}`, pageWidth - 60, 13);

  // Tabela
  const rows = activities.map((act) => [
    act.title,
    act.programs?.name || "—",
    act.persons?.name || "—",
    act.priority || "Média",
    act.status || "Planejado",
    act.due_date ? format(parseISO(act.due_date), "dd/MM/yyyy") : "—",
  ]);

  doc.autoTable({
    startY: 35,
    head: [["Atividade", "Programa", "Responsável", "Prioridade", "Status", "Data"]],
    body: rows,
    theme: "striped",
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
    alternateRowStyles: { fillColor: [245, 248, 245] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
    },
  });

  // Rodapé
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setDrawColor(...primaryColor);
  doc.line(10, finalY, pageWidth - 10, finalY);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("AGENDA IRACAMBI – Sistema de Gestão de Atividades | Colegiado IRACAMBI®", pageWidth / 2, finalY + 6, { align: "center" });
  doc.text("Este relatório é gerado automaticamente pelo sistema.", pageWidth / 2, finalY + 11, { align: "center" });

  const fileName = `relatorio_iracambi_${weekStart}_${weekEnd}.pdf`;
  doc.save(fileName);
}