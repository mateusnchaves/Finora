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

export const TRANSACTION_COLUMNS =
  "id, type, amount, date, description, notes, account_id, transfer_account_id, category_id, created_at, installment_group_id, installment_number, installment_count";

export type TransactionRow = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  installment_group_id: string | null;
  installment_number: number | null;
  installment_count: number | null;
};

export type NameLookups = { accounts: Map<string, string>; categories: Map<string, string> };

export function nameLookups(lookups: { accounts: Account[]; categories: Category[] }): NameLookups {
  return {
    accounts: new Map(lookups.accounts.map((a) => [a.id, a.name])),
    categories: new Map(lookups.categories.map((c) => [c.id, c.name])),
  };
}

/** Joins names in memory: accounts and categories are already loaded for the filters. */
export function toTransactionItem(row: TransactionRow, { accounts, categories }: NameLookups): TransactionItem {
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
    installmentGroupId: row.installment_group_id,
    installmentNumber: row.installment_number,
    installmentCount: row.installment_count,
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

  const names = nameLookups(lookups);
  return data.map((row) => toTransactionItem(row, names));
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

  return toTransactionItem(data, nameLookups(lookups));
}
