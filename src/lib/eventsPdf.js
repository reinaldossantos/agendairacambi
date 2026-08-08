import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { eventPeriod, normalizeEventData } from "./events";

const dateLabel = (value) => value ? format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";

export function generateEventsPdf(events, filters = {}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(18);
  doc.text("AGENDA IRACAMBI", 14, 16);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text("Programação de eventos", 14, 24);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const range = filters.start || filters.end ? `Período: ${filters.start || "início"} a ${filters.end || "fim"}` : "Todos os períodos";
  doc.text(`${range} · ${events.length} evento(s)`, 14, 30);

  autoTable(doc, {
    startY: 35,
    head: [["Período", "Evento", "Tipo / temática", "Programa", "Responsável", "Local / formato", "Situação", "Parceiros"]],
    body: events.map((event) => {
      const data = normalizeEventData(event.event_data);
      const period = eventPeriod(event);
      return [
        `${dateLabel(period.start)}\n${dateLabel(period.end)}`,
        event.title,
        `${data.type || "—"}\n${data.theme || "—"}`,
        event.programs?.name || "—",
        event.persons?.name || "—",
        `${data.location || "—"}\n${data.format || "—"}`,
        data.status || "Planejamento",
        data.partners || "—",
      ];
    }),
    styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 202);
      doc.text(`Página ${doc.getNumberOfPages()}`, 282, 202, { align: "right" });
    },
  });
  doc.save(`programacao-eventos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
