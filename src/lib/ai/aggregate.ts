/*
 * Pure helpers behind the assistant's tools: totals and groupings over a list of
 * transactions, matching names the way people type them, and the links that show where
 * each number came from. No I/O here, so it is unit-tested.
 */
import type { TransactionType } from "@/lib/data/types";
import { monthOf, shiftMonth } from "@/lib/dates";
import { formatMonth } from "@/lib/format";
import { transactionsHref } from "@/lib/transaction-filters";

export type AiRow = {
  date: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryName: string | null;
  accountName: string;
};

export const GROUP_BY = ["none", "category", "description", "month", "account"] as const;
export type GroupBy = (typeof GROUP_BY)[number];

export type Aggregate = {
  count: number;
  income: number;
  expenses: number;
  transfers: number;
  groups: { key: string; total: number; count: number }[];
  transactions: AiRow[];
};

const MAX_GROUPS = 15;

/** Lowercase without accents or extra spaces: "Alimentação " → "alimentacao". */
export function normalizeName(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Finds an item by name, ignoring case and accents. */
export function findByName<T extends { name: string }>(items: T[], name: string): T | undefined {
  const wanted = normalizeName(name);
  return items.find((item) => normalizeName(item.name) === wanted);
}

function groupKey(row: AiRow, groupBy: GroupBy): string {
  switch (groupBy) {
    case "category":
      return row.type === "transfer" ? "Transferências" : (row.categoryName ?? "Sem categoria");
    case "description":
      // Installments of one purchase share a description; group them together.
      return row.description.replace(/\s*-?\s*parcela\s*\d+\s*(\/|de)\s*\d+/i, "").trim();
    case "month":
      return monthOf(row.date);
    case "account":
      return row.accountName;
    default:
      return "";
  }
}

export function aggregate(rows: AiRow[], groupBy: GroupBy, limit: number): Aggregate {
  const sum = (type: TransactionType) => round(rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0));

  const groups = new Map<string, { key: string; total: number; count: number }>();
  if (groupBy !== "none") {
    for (const row of rows) {
      const key = groupKey(row, groupBy);
      const group = groups.get(key) ?? { key, total: 0, count: 0 };
      group.total = round(group.total + row.amount);
      group.count += 1;
      groups.set(key, group);
    }
  }

  return {
    count: rows.length,
    income: sum("income"),
    expenses: sum("expense"),
    transfers: sum("transfer"),
    groups: [...groups.values()]
      .sort((a, b) => (groupBy === "month" ? a.key.localeCompare(b.key) : b.total - a.total))
      .slice(0, MAX_GROUPS),
    transactions: [...rows].sort((a, b) => b.amount - a.amount).slice(0, limit),
  };
}

/** Months covered by a date range, oldest first. */
export function monthsInRange(start: string, end: string): string[] {
  const months: string[] = [];
  for (let m = monthOf(start); m <= monthOf(end) && months.length < 36; m = shiftMonth(m, 1)) months.push(m);
  return months;
}

export type Source = { label: string; href: string };

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Despesas",
  income: "Receitas",
  transfer: "Transferências",
};

/**
 * Links to the transactions page with the same filters, one per month (the page shows one
 * month at a time). Long ranges link to their last three months.
 */
export function sourceLinks(
  range: { start: string; end: string },
  filters: { type?: TransactionType; categoryId?: string; categoryName?: string; accountId?: string; text?: string },
): Source[] {
  const parts = [
    filters.type ? TYPE_LABELS[filters.type] : "Lançamentos",
    filters.categoryName,
    filters.text ? `“${filters.text}”` : undefined,
  ].filter(Boolean);

  return monthsInRange(range.start, range.end)
    .slice(-3)
    .map((month) => ({
      label: `${parts.join(" · ")} em ${formatMonth(month)}`,
      href: transactionsHref({
        month,
        type: filters.type,
        categoryId: filters.categoryId,
        accountId: filters.accountId,
        search: filters.text,
      }),
    }));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
