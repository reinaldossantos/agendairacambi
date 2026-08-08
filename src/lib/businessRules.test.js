import { describe, expect, it } from "vitest";
import { canEditExpense, canManageProject, vehicleBookingError } from "./businessRules";

const user = { id: "u1", is_active: true, access_role: "user" };
const admin = { id: "a1", is_active: true, access_role: "admin" };

describe("despesas", () => {
  it("limita autor a rascunho/ajustes e permite aprovador", () => {
    expect(canEditExpense({ person_id: "u1", status: "draft" }, user)).toBe(true);
    expect(canEditExpense({ person_id: "u1", status: "approved" }, user)).toBe(false);
    expect(canEditExpense({ person_id: "u2", status: "pending_approval" }, user, ["u1"])).toBe(true);
  });
});

describe("projetos", () => {
  it("permite gestor/equipe/admin e bloqueia terceiros", () => {
    const project = { created_by: "u2", manager_id: "u3", team_ids: ["u1"] };
    expect(canManageProject(project, user)).toBe(true);
    expect(canManageProject(project, { ...user, id: "u9" })).toBe(false);
    expect(canManageProject(project, admin)).toBe(true);
  });
});

describe("veículos", () => {
  it("valida período, passageiros e capacidade", () => {
    expect(vehicleBookingError({ startAt: "2026-01-02", endAt: "2026-01-01", passengers: 1, capacity: 4 })).toBe("invalid_period");
    expect(vehicleBookingError({ startAt: "2026-01-01", endAt: "2026-01-02", passengers: 5, capacity: 4 })).toBe("capacity_exceeded");
    expect(vehicleBookingError({ startAt: "2026-01-01", endAt: "2026-01-02", passengers: 4, capacity: 4 })).toBe(null);
  });
});
