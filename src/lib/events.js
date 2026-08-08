export const EVENT_TYPES = ["Seminário", "Workshop", "Mostra", "Encontro", "Feira", "Palestra", "Outro"];
export const EVENT_STATUSES = ["Planejamento", "Confirmado", "Em andamento", "Realizado", "Adiado", "Cancelado"];
export const EVENT_FORMATS = ["Presencial", "On-line", "Híbrido"];

export const emptyEventData = () => ({
  type: "",
  theme: "",
  start_at: "",
  end_at: "",
  location: "",
  format: "Presencial",
  audience_expected: "",
  audience_reached: "",
  partners: "",
  counterparts: "",
  counterparts_completed: "",
  expected_results: "",
  results: "",
  status: "Planejamento",
  notes: "",
});

export function normalizeEventData(value) {
  return { ...emptyEventData(), ...(value || {}) };
}
export function eventPeriod(activity) {
  const data = normalizeEventData(activity?.event_data);
  return {
    start: data.start_at || activity?.due_date || "",
    end: data.end_at || data.start_at || activity?.due_date || "",
  };
}
