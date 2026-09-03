import { describe, expect, it } from "vitest";
import { lineTotal, programUsage } from "./budget";

describe("orçamentos", () => {
  it("soma os doze meses de uma rubrica", () => {
    expect(lineTotal({ monthly_amounts: [10, 20, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0] })).toBe(60);
  });

  it("calcula realizado e rateia compras compartilhadas", () => {
    const usage = programUsage("p1", 2026,
      [{ program_id: "p1", status: "approved", expense_items: [{ date: "2026-03-01", amount: 100 }] }],
      [{ program_ids: ["p1", "p2"], status: "ordered", needed_by: "2026-04-01", estimated_total: 200 }]);
    expect(usage).toEqual({ realized: 100, committed: 100, used: 200, sharedPurchases: 1 });
  });

  it("ignora rascunhos, rejeições e compras recebidas", () => {
    const usage = programUsage("p1", 2026,
      [{ program_id: "p1", status: "draft", expense_items: [{ date: "2026-03-01", amount: 100 }] }],
      [{ program_ids: ["p1"], status: "received", needed_by: "2026-04-01", estimated_total: 200 }]);
    expect(usage.used).toBe(0);
  });
});
