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

export const UNCATEGORIZED = "Sem categoria";

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
