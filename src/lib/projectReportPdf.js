import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { deadlineState, money, priorityLabel, projectCode, projectProgress, statusInfo, typeInfo } from "./projectManagement";

const date = (value) => value ? value.split("-").reverse().join("/") : "—";

export function generateProjectPdf(project) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const primary = [26, 59, 46];
  doc.setFillColor(...primary); doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text("IRACAMBI — RELATÓRIO DE PROJETO", 14, 12);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`${projectCode(project)} · ${project.title}`, 14, 20);
  autoTable(doc, { startY: 34, theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: primary }, body: [
    ["Programa", project.program?.name || "—", "Tipo", typeInfo(project.project_type).label],
    ["Categoria", project.category, "Situação", statusInfo(project.status).label],
    ["Responsável", project.manager?.name || "—", "Prioridade", priorityLabel(project.priority)],
    ["Prazo", `${date(project.planned_start)} a ${date(project.planned_end)}`, "Progresso", `${projectProgress(project)}%`],
    ["Situação do prazo", { overdue: "Atrasado", attention: "Atenção", on_track: "Dentro do prazo", neutral: "—" }[deadlineState(project)], "Local", project.location || "—"],
  ] });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 4, theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: primary }, head: [["Contexto e objetivos", "Descrição"]], body: [
    ["Descrição", project.description || "—"], ["Necessidade identificada", project.need_statement || "—"],
    ["Objetivo geral", project.general_objective || "—"], ["Resultados esperados", project.expected_results || "—"],
  ] });
  autoTable(doc, { startY: doc.lastAutoTable.finalY + 4, theme: "grid", styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: primary }, head: [["Planejamento financeiro", "Valor"]], body: [
    ["Orçamento previsto", money(project.planned_budget)], ["Valor comprometido", money(project.committed_budget)], ["Valor realizado", money(project.actual_budget)], ["Saldo previsto", money(Number(project.planned_budget || 0) - Number(project.actual_budget || 0))],
  ] });
  if (project.tasks?.length) autoTable(doc, { startY: doc.lastAutoTable.finalY + 4, theme: "grid", styles: { fontSize: 7.5, cellPadding: 1.8 }, headStyles: { fillColor: primary }, head: [["Etapa", "Tarefa/entrega", "Responsável", "Prazo", "Situação", "Horas"]], body: project.tasks.map((task) => [task.stage || "—", task.title, task.responsible?.name || "—", date(task.planned_end), { pending: "Pendente", in_progress: "Em andamento", blocked: "Bloqueada", completed: "Concluída", cancelled: "Cancelada" }[task.status], String(task.hours || 0)]) });
  if (project.risks?.length) autoTable(doc, { startY: doc.lastAutoTable.finalY + 4, theme: "grid", styles: { fontSize: 7.5, cellPadding: 1.8 }, headStyles: { fillColor: [153, 62, 21] }, head: [["Risco", "Probabilidade", "Impacto", "Situação", "Resposta"]], body: project.risks.map((risk) => [risk.title, risk.probability, risk.impact, risk.status, risk.response_plan || "—"]) });
  doc.setTextColor(90); doc.setFontSize(7); doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} · Agenda Iracambi`, 105, 290, { align: "center" });
  doc.save(`${projectCode(project).toLowerCase()}_${project.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.pdf`);
}

export function exportProjectsCsv(projects) {
  const rows = [["Código", "Projeto", "Programa", "Tipo", "Categoria", "Status", "Prioridade", "Responsável", "Início", "Conclusão", "Progresso", "Orçamento previsto", "Realizado"]];
  projects.forEach((project) => rows.push([projectCode(project), project.title, project.program?.name || "", typeInfo(project.project_type).label, project.category, statusInfo(project.status).label, priorityLabel(project.priority), project.manager?.name || "", project.planned_start || "", project.planned_end || "", `${projectProgress(project)}%`, project.planned_budget || 0, project.actual_budget || 0]));
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\n");
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); link.download = `portfolio_projetos_${format(new Date(), "yyyy-MM-dd")}.csv`; link.click(); URL.revokeObjectURL(link.href);
}
