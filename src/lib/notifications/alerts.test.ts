import { describe, expect, it } from "vitest";
import { alertsFor, type AlertInput } from "./alerts";

const base: AlertInput = { today: "2026-10-08", month: "2026-10", bills: [], budgets: [], goals: [] };
const bill = { cardId: "card-1", cardName: "Nubank", dueMonth: "2026-10", due: "2026-10-10", total: 500, paid: 0 };

describe("bill alerts", () => {
  it("announces an unpaid bill in the last three days before it is due", () => {
    const [alert] = alertsFor({ ...base, bills: [bill] });
    expect(alert).toEqual({
      kind: "bill_due",
      ref: "card-1:2026-10-10",
      title: "Fatura do Nubank vence em 2 dias (10 out)",
      body: "Faltam R$ 500,00 para pagar.",
      url: "/cards/card-1?month=2026-10",
    });
    expect(alertsFor({ ...base, today: "2026-10-10", bills: [bill] })[0].title).toBe("Fatura do Nubank vence hoje");
  });

  it("stays quiet when it is too early, already late, or paid", () => {
    expect(alertsFor({ ...base, today: "2026-10-06", bills: [bill] })).toEqual([]);
    expect(alertsFor({ ...base, today: "2026-10-11", bills: [bill] })).toEqual([]);
    expect(alertsFor({ ...base, bills: [{ ...bill, paid: 500 }] })).toEqual([]);
  });

  it("counts what is left after a partial payment", () => {
    expect(alertsFor({ ...base, bills: [{ ...bill, paid: 120.5 }] })[0].body).toBe("Faltam R$ 379,50 para pagar.");
  });
});

describe("budget and goal alerts", () => {
  it("flags a budget over its limit, once per month", () => {
    const budgets = [
      { id: "b1", categoryName: "Compras", limit: 250, spent: 760 },
      { id: "b2", categoryName: "Lazer", limit: 300, spent: 300 },
    ];
    const alerts = alertsFor({ ...base, budgets });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ ref: "b1:2026-10", title: "Orçamento de Compras estourado" });
  });

  it("celebrates a reached goal", () => {
    const goals = [
      { id: "g1", name: "Curso de inglês", target: 2400, saved: 2400 },
      { id: "g2", name: "Viagem", target: 9000, saved: 3300 },
    ];
    expect(alertsFor({ ...base, goals }).map((a) => a.ref)).toEqual(["g1"]);
  });
});
