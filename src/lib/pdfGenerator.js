import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function generateWeeklyPDF({ weekStart, weekEnd, activities }) {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const primaryColor = [26, 59, 46];

    // Cabeçalho verde
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 24, "F");

    // Título do relatório (apenas texto, sem logo)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("AGENDA IRACAMBI", 14, 14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório Semanal de Atividades", 14, 21);

    // Período
    const startFormatted = format(parseISO(weekStart), "dd 'de' MMMM", {
      locale: ptBR,
    });
    const endFormatted = format(parseISO(weekEnd), "dd 'de' MMMM", {
      locale: ptBR,
    });
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(
      `Período: ${startFormatted} – ${endFormatted}`,
      pageWidth - 70,
      10,
      { align: "right" },
    );

    // Data de emissão e total
    const hoje = format(new Date(), "dd/MM/yyyy 'às' HH:mm");
    doc.setFontSize(8);
    doc.text(`Emitido em: ${hoje}`, pageWidth - 70, 16, { align: "right" });
    doc.text(`Total de atividades: ${activities.length}`, pageWidth - 70, 21, {
      align: "right",
    });

    // Linha divisória abaixo do cabeçalho
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(14, 27, pageWidth - 14, 27);

    // Corpo da tabela
    const rows = activities.map((act) => [
      act.title,
      act.programs?.name || "—",
      act.persons?.name || "—",
      act.priority || "Média",
      act.status || "Planejado",
      act.due_date ? format(parseISO(act.due_date), "dd/MM/yyyy") : "—",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Atividade",
          "Programa",
          "Responsável",
          "Prioridade",
          "Status",
          "Data",
        ],
      ],
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
      didDrawPage: function (data) {
        // Se for a última página, não faz nada (rodapé será colocado após a tabela)
      },
    });

    // Rodapé fixo na parte inferior da última página
    const footerY = pageHeight - 12;
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "AGENDA IRACAMBI – Sistema de Gestão de Atividades | Colegiado IRACAMBI®",
      pageWidth / 2,
      footerY,
      { align: "center" },
    );
    doc.text(
      "Este relatório é gerado automaticamente pelo sistema.",
      pageWidth / 2,
      footerY + 4,
      { align: "center" },
    );

    // Linha acima do rodapé (opcional)
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.2);
    doc.line(14, footerY - 3, pageWidth - 14, footerY - 3);

    // Salva
    const fileName = `relatorio_iracambi_${weekStart}_${weekEnd}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Erro ao gerar PDF. Verifique o console para mais detalhes.");
  }
}
