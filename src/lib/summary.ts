import type { Transaction } from "@/lib/mock-data";

export type MonthSummary = {
  income: number;
  expenses: number;
  net: number;
};

export function summarize(transactions: Transaction[]): MonthSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export type CategoryTotal = { category: string; total: number; share: number };

/** Expenses grouped by category, largest first. `share` is 0-1 of all expenses. */
export function expensesByCategory(transactions: Transaction[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  const all = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total, share: all ? total / all : 0 }))
    .sort((a, b) => b.total - a.total);
}
