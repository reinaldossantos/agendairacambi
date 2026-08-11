import { describe, expect, it } from "vitest";
import { sentenceCase, sentenceCaseEventData } from "./textFormatting";

describe("sentenceCase", () => {
  it("padroniza maiúsculas e minúsculas", () => {
    expect(sentenceCase("  COMPRA DE NOTEBOOKS  ")).toBe("Compra de notebooks");
    expect(sentenceCase("visita À COMUNIDADE")).toBe("Visita à comunidade");
  });

  it("coloca em maiúscula a primeira letra mesmo após número ou pontuação", () => {
    expect(sentenceCase("2026 - NOVO PROJETO")).toBe("2026 - Novo projeto");
  });
});

describe("sentenceCaseEventData", () => {
  it("formata somente textos narrativos e preserva campos técnicos", () => {
    expect(sentenceCaseEventData({ theme: "EDUCAÇÃO AMBIENTAL", format: "On-line", start_at: "2026-08-12T09:00" }))
      .toEqual({ theme: "Educação ambiental", format: "On-line", start_at: "2026-08-12T09:00" });
  });
});
