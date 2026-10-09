import { describe, expect, it } from "vitest";
import type { TransactionItem } from "@/lib/data/types";
import { expensesByCategory, groupByDate, summarize } from "./summary";

function tx(partial: Partial<TransactionItem>): TransactionItem {
  return {
    id: crypto.randomUUID(),
    type: "expense",
    amount: 10,
    date: "2026-10-01",
    description: "x",
    notes: null,
    accountId: "a",
    accountName: "A",
    transferAccountId: null,
    transferAccountName: null,
    categoryId: null,
    categoryName: null,
    ...partial,
  };
}

describe("summarize", () => {
  it("ignores transfers", () => {
    const result = summarize([
      tx({ type: "income", amount: 1000 }),
      tx({ type: "expense", amount: 250 }),
      tx({ type: "transfer", amount: 500, transferAccountId: "b" }),
    ]);
    expect(result).toEqual({ income: 1000, expenses: 250, net: 750 });
  });
});

describe("expensesByCategory", () => {
  it("groups, sorts and computes shares", () => {
    const result = expensesByCategory([
      tx({ categoryName: "Moradia", amount: 300 }),
      tx({ categoryName: "Lazer", amount: 50 }),
      tx({ categoryName: "Moradia", amount: 100 }),
      tx({ categoryName: null, amount: 50 }),
      tx({ type: "income", categoryName: "Salário", amount: 5000 }),
    ]);
    expect(result).toEqual([
      { category: "Moradia", total: 400, share: 0.8 },
      { category: "Lazer", total: 50, share: 0.1 },
      { category: "Sem categoria", total: 50, share: 0.1 },
    ]);
  });
});

describe("groupByDate", () => {
  it("keeps order and groups consecutive days", () => {
    const groups = groupByDate([
      tx({ date: "2026-10-05" }),
      tx({ date: "2026-10-05" }),
      tx({ date: "2026-10-03" }),
    ]);
    expect(groups.map((g) => [g.date, g.items.length])).toEqual([
      ["2026-10-05", 2],
      ["2026-10-03", 1],
    ]);
  });
});
