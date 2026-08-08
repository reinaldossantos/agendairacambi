import { describe, expect, it } from "vitest";
import { escapeHtml, isAdministrator, isUsableProfile } from "./security";

describe("autenticação", () => {
  it("rejeita perfis ausentes, inativos e bloqueados", () => {
    expect(isUsableProfile(null)).toBe(false);
    expect(isUsableProfile({ id: "1", is_active: false })).toBe(false);
    expect(isUsableProfile({ id: "1", locked_at: "2026-01-01" })).toBe(false);
  });
  it("aceita perfil ativo não bloqueado", () => expect(isUsableProfile({ id: "1", is_active: true })).toBe(true));
});

describe("administração", () => {
  it("exige perfil admin ativo", () => {
    expect(isAdministrator({ id: "1", is_active: true, access_role: "admin" })).toBe(true);
    expect(isAdministrator({ id: "1", is_active: false, access_role: "admin" })).toBe(false);
    expect(isAdministrator({ id: "1", is_active: true, access_role: "user" })).toBe(false);
  });
});

describe("impressão segura", () => {
  it("escapa marcação executável", () => expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"));
});

