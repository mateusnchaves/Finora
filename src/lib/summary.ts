import type { TransactionItem } from "@/lib/data/types";

export type PeriodSummary = {
  income: number;
  expenses: number;
  net: number;
};

/** Income and expense totals. Transfers move money between accounts and are left out. */
export function summarize(transactions: TransactionItem[]): PeriodSummary {
  let income = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expenses += t.amount;
  }
  return { income, expenses, net: income - expenses };
}

export type CategoryTotal = { category: string; total: number; share: number };

export const UNCATEGORIZED = "Sem categoria";

/** Expenses grouped by category, largest first. `share` is 0-1 of all expenses. */
export function expensesByCategory(transactions: TransactionItem[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const category = t.categoryName ?? UNCATEGORIZED;
    totals.set(category, (totals.get(category) ?? 0) + t.amount);
  }
  const all = [...totals.values()].reduce((sum, v) => sum + v, 0);
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total, share: all ? total / all : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Groups an already date-sorted list into consecutive days. */
export function groupByDate(transactions: TransactionItem[]): { date: string; items: TransactionItem[] }[] {
  const groups: { date: string; items: TransactionItem[] }[] = [];
  for (const t of transactions) {
    const last = groups.at(-1);
    if (last?.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }
  return groups;
}
