import { describe, expect, it } from "vitest";
import { aggregate, findByName, monthsInRange, normalizeName, sourceLinks, type AiRow } from "./aggregate";

function row(partial: Partial<AiRow>): AiRow {
  return {
    date: "2026-10-05",
    type: "expense",
    amount: 10,
    description: "Mercado",
    categoryName: "Alimentação",
    accountName: "Nubank",
    ...partial,
  };
}

describe("names", () => {
  it("ignores case, accents and spaces", () => {
    expect(normalizeName("  Alimentação  ")).toBe("alimentacao");
    expect(findByName([{ name: "Alimentação" }, { name: "Saúde" }], "saude")).toEqual({ name: "Saúde" });
    expect(findByName([{ name: "Lazer" }], "Viagem")).toBeUndefined();
  });
});

describe("aggregate", () => {
  const rows = [
    row({ amount: 100, description: "iFood", date: "2026-09-10" }),
    row({ amount: 50.5, description: "iFood" }),
    row({ amount: 300, description: "Notebook - Parcela 2/10", categoryName: "Compras" }),
    row({ amount: 300, description: "Notebook - Parcela 3/10", categoryName: "Compras", date: "2026-11-15" }),
    row({ type: "income", amount: 5000, description: "Salário", categoryName: "Salário" }),
    row({ type: "transfer", amount: 800, description: "Pagamento da fatura", categoryName: null }),
  ];

  it("sums by type, keeping transfers apart", () => {
    const result = aggregate(rows, "none", 3);
    expect(result).toMatchObject({ count: 6, income: 5000, expenses: 750.5, transfers: 800, groups: [] });
    expect(result.transactions.map((t) => t.amount)).toEqual([5000, 800, 300]);
  });

  it("groups installments of one purchase together", () => {
    const groups = aggregate(rows.filter((r) => r.type === "expense"), "description", 10).groups;
    expect(groups).toEqual([
      { key: "Notebook", total: 600, count: 2 },
      { key: "iFood", total: 150.5, count: 2 },
    ]);
  });

  it("orders months by date and categories by total", () => {
    expect(aggregate(rows, "month", 0).groups.map((g) => g.key)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(aggregate(rows, "category", 0).groups[0]).toEqual({ key: "Salário", total: 5000, count: 1 });
    expect(aggregate(rows, "category", 0).groups.map((g) => g.key)).toContain("Transferências");
  });
});

describe("links", () => {
  it("lists the months of a range", () => {
    expect(monthsInRange("2026-11-20", "2027-01-05")).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("links one filtered page per month, at most the last three", () => {
    const links = sourceLinks(
      { start: "2026-06-01", end: "2026-10-31" },
      { type: "expense", categoryId: "11111111-1111-1111-1111-111111111111", categoryName: "Alimentação", text: "ifood" },
    );
    expect(links).toHaveLength(3);
    expect(links[2]).toEqual({
      label: "Despesas · Alimentação · “ifood” em outubro de 2026",
      href: "/transactions?month=2026-10&type=expense&category=11111111-1111-1111-1111-111111111111&q=ifood",
    });
  });
});
