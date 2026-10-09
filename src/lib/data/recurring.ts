import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category } from "./types";

export type RecurringRule = {
  id: string;
  type: "income" | "expense";
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  amount: number;
  description: string;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  /** Last date already turned into transactions. */
  generatedUntil: string | null;
  active: boolean;
};

const COLUMNS =
  "id, type, account_id, category_id, amount, description, day_of_month, start_date, end_date, generated_until, active";

type Row = {
  id: string;
  type: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  generated_until: string | null;
  active: boolean;
};

function toRule(row: Row, lookups: { accounts: Account[]; categories: Category[] }): RecurringRule {
  return {
    id: row.id,
    type: row.type === "income" ? "income" : "expense",
    accountId: row.account_id,
    accountName: lookups.accounts.find((a) => a.id === row.account_id)?.name ?? "Conta removida",
    categoryId: row.category_id,
    categoryName: lookups.categories.find((c) => c.id === row.category_id)?.name ?? null,
    amount: Number(row.amount),
    description: row.description,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date,
    generatedUntil: row.generated_until,
    active: row.active,
  };
}

export async function getRecurringRules(lookups: { accounts: Account[]; categories: Category[] }) {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select(COLUMNS)
    .order("active", { ascending: false })
    .order("day_of_month")
    .order("description");
  if (error) throw error;
  return data.map((row) => toRule(row, lookups));
}

export async function getRecurringRule(id: string, lookups: { accounts: Account[]; categories: Category[] }) {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("recurring_rules").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRule(data, lookups) : null;
}
