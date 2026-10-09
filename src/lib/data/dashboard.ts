import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { monthOf, monthRange, shiftMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, TransactionItem } from "./types";

export type MonthTotals = { month: string; income: number; expenses: number };

export type CategorySpending = {
  categoryId: string | null;
  name: string | null;
  total: number;
  count: number;
};

/** Income and expenses for `count` months ending at `lastMonth` (inclusive), oldest first. */
export async function getMonthlyTotals(lastMonth: string, count: number): Promise<MonthTotals[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("monthly_totals", {
    p_from: monthRange(shiftMonth(lastMonth, -(count - 1))).start,
    p_to: monthRange(lastMonth).end,
  });
  if (error) throw error;
  return data.map((row) => ({
    month: monthOf(row.month),
    income: Number(row.income),
    expenses: Number(row.expenses),
  }));
}

/** Total expenses between two dates, both inclusive (e.g. 1–8 Sep to compare with 1–8 Oct). */
export async function getExpensesBetween(from: string, to: string): Promise<number> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("monthly_totals", { p_from: from, p_to: nextDay(to) });
  if (error) throw error;
  return data.reduce((sum, row) => sum + Number(row.expenses), 0);
}

function nextDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Expenses of a month grouped by category, largest first. */
export async function getSpendingByCategory(month: string): Promise<CategorySpending[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase.rpc("expense_category_totals", { p_from: start, p_to: end });
  if (error) throw error;
  return data.map((row) => ({
    categoryId: row.category_id,
    name: row.category_name,
    total: Number(row.total),
    count: row.transaction_count,
  }));
}

type Lookups = { accounts: Account[]; categories: Category[] };

const COLUMNS = "id, type, amount, date, description, notes, account_id, transfer_account_id, category_id";

/** Largest expenses of the month, or the latest movements of any type. */
export async function getHighlights(
  month: string,
  lookups: Lookups,
): Promise<{ topExpenses: TransactionItem[]; latest: TransactionItem[] }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { start, end } = monthRange(month);

  const [top, latest] = await Promise.all([
    supabase
      .from("transactions")
      .select(COLUMNS)
      .eq("type", "expense")
      .gte("date", start)
      .lt("date", end)
      .order("amount", { ascending: false })
      .limit(5),
    supabase
      .from("transactions")
      .select(COLUMNS)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (top.error) throw top.error;
  if (latest.error) throw latest.error;

  const accountNames = new Map(lookups.accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(lookups.categories.map((c) => [c.id, c.name]));
  const toItem = (row: (typeof top.data)[number]): TransactionItem => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    description: row.description,
    notes: row.notes,
    accountId: row.account_id,
    accountName: accountNames.get(row.account_id) ?? "Conta removida",
    transferAccountId: row.transfer_account_id,
    transferAccountName: row.transfer_account_id ? (accountNames.get(row.transfer_account_id) ?? null) : null,
    categoryId: row.category_id,
    categoryName: row.category_id ? (categoryNames.get(row.category_id) ?? null) : null,
  });

  return { topExpenses: top.data.map(toItem), latest: latest.data.map(toItem) };
}
