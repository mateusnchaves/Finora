import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { monthRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, TransactionItem, TransactionType } from "./types";

export type TransactionFilters = {
  month: string; // yyyy-mm
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  search?: string;
};

const TRANSACTION_COLUMNS =
  "id, type, amount, date, description, notes, account_id, transfer_account_id, category_id, created_at";

type TransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
};

/** Joins names in memory: accounts and categories are already loaded for the filters. */
function toItem(row: TransactionRow, accounts: Map<string, string>, categories: Map<string, string>): TransactionItem {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    description: row.description,
    notes: row.notes,
    accountId: row.account_id,
    accountName: accounts.get(row.account_id) ?? "Conta removida",
    transferAccountId: row.transfer_account_id,
    transferAccountName: row.transfer_account_id ? (accounts.get(row.transfer_account_id) ?? "Conta removida") : null,
    categoryId: row.category_id,
    categoryName: row.category_id ? (categories.get(row.category_id) ?? null) : null,
  };
}

/** Escapes characters that have meaning in a Postgres ILIKE pattern. */
function likePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function getTransactions(
  filters: TransactionFilters,
  lookups: { accounts: Account[]; categories: Category[] },
): Promise<TransactionItem[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { start, end } = monthRange(filters.month);

  let query = supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.accountId) {
    // A transfer belongs to both of its accounts.
    query = query.or(`account_id.eq.${filters.accountId},transfer_account_id.eq.${filters.accountId}`);
  }
  if (filters.search) query = query.ilike("description", likePattern(filters.search));

  const { data, error } = await query;
  if (error) throw error;

  const accountNames = new Map(lookups.accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(lookups.categories.map((c) => [c.id, c.name]));
  return data.map((row) => toItem(row, accountNames, categoryNames));
}

export async function getTransaction(
  id: string,
  lookups: { accounts: Account[]; categories: Category[] },
): Promise<TransactionItem | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").select(TRANSACTION_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const accountNames = new Map(lookups.accounts.map((a) => [a.id, a.name]));
  const categoryNames = new Map(lookups.categories.map((c) => [c.id, c.name]));
  return toItem(data, accountNames, categoryNames);
}
