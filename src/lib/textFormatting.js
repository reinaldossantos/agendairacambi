export function sentenceCase(value) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("pt-BR");
  return normalized.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

const eventTextFields = [
  "theme", "location", "partners", "counterparts", "counterparts_completed",
  "expected_results", "results", "notes",
];

export function sentenceCaseEventData(value = {}) {
  const result = { ...value };
  for (const field of eventTextFields) {
    if (typeof result[field] === "string" && result[field].trim()) result[field] = sentenceCase(result[field]);
  }
  return result;
}
