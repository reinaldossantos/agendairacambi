export const PROJECT_TYPES = [
  { value: "strategic", label: "Estratégico", color: "violet", icon: "strategy", description: "Objetivos institucionais e impacto de longo prazo." },
  { value: "operational", label: "Operacional", color: "blue", icon: "manufacturing", description: "Processos, infraestrutura e condições de trabalho." },
  { value: "emergency", label: "Emergencial", color: "red", icon: "emergency_home", description: "Problemas críticos e necessidades urgentes." },
  { value: "mandatory", label: "Compulsório", color: "amber", icon: "gavel", description: "Leis, normas, contratos e condicionantes." },
];

export const PROJECT_STATUSES = [
  { value: "ideas", label: "Ideias e necessidades", icon: "lightbulb", color: "slate" },
  { value: "analysis", label: "Em análise", icon: "manage_search", color: "cyan" },
  { value: "planning", label: "Planejamento", icon: "edit_calendar", color: "blue" },
  { value: "awaiting_approval", label: "Aguardando aprovação", icon: "approval", color: "amber" },
  { value: "approved", label: "Aprovado", icon: "verified", color: "emerald" },
  { value: "in_progress", label: "Em execução", icon: "rocket_launch", color: "green" },
  { value: "paused", label: "Pausado", icon: "pause_circle", color: "orange" },
  { value: "completed", label: "Concluído", icon: "task_alt", color: "teal" },
  { value: "cancelled", label: "Cancelado", icon: "cancel", color: "red" },
];

export const PROJECT_CATEGORIES = ["Melhoria", "Reforma", "Infraestrutura", "Tecnologia", "Meio ambiente", "Desenvolvimento institucional", "Projeto social", "Outro"];
export const PRIORITIES = [
  { value: "low", label: "Baixa" }, { value: "medium", label: "Média" },
  { value: "high", label: "Alta" }, { value: "critical", label: "Crítica" },
];

export const typeInfo = (value) => PROJECT_TYPES.find((item) => item.value === value) || PROJECT_TYPES[1];
export const statusInfo = (value) => PROJECT_STATUSES.find((item) => item.value === value) || PROJECT_STATUSES[0];
export const priorityLabel = (value) => PRIORITIES.find((item) => item.value === value)?.label || value;
export const projectCode = (project) => `PRJ-${String(project.project_number || 0).padStart(5, "0")}`;
export const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function projectProgress(project) {
  const tasks = project.tasks || [];
  if (project.progress_mode === "manual" || !tasks.length) return Math.round(Number(project.manual_progress || 0));
  if (project.progress_mode === "weighted") {
    const total = tasks.reduce((sum, task) => sum + Number(task.weight || 1), 0);
    const completed = tasks.filter((task) => task.status === "completed").reduce((sum, task) => sum + Number(task.weight || 1), 0);
    return total ? Math.round((completed / total) * 100) : 0;
  }
  return Math.round((tasks.filter((task) => task.status === "completed").length / tasks.length) * 100);
}

export function deadlineState(project) {
  if (["completed", "cancelled"].includes(project.status) || !project.planned_end) return "neutral";
  const remaining = Math.ceil((new Date(`${project.planned_end}T23:59:59`) - new Date()) / 86400000);
  if (remaining < 0) return "overdue";
  if (remaining <= 15) return "attention";
  return "on_track";
}
