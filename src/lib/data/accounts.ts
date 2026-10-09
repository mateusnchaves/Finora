import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account } from "./types";

const ACCOUNT_COLUMNS = "id, name, type, initial_balance, balance, archived, transaction_count";

type AccountRow = {
  id: string | null;
  name: string | null;
  type: Account["type"] | null;
  initial_balance: number | null;
  balance: number | null;
  archived: boolean | null;
  transaction_count: number | null;
};

function toAccount(row: AccountRow): Account {
  return {
    id: row.id!,
    name: row.name ?? "",
    type: row.type ?? "checking",
    initialBalance: Number(row.initial_balance ?? 0),
    balance: Number(row.balance ?? 0),
    archived: row.archived ?? false,
    transactionCount: row.transaction_count ?? 0,
  };
}

/** The user's accounts with current balances, active ones first, then by name. */
export async function getAccounts({ includeArchived = false } = {}): Promise<Account[]> {
  await getCurrentUser();
  const supabase = await createClient();
  let query = supabase.from("account_balances").select(ACCOUNT_COLUMNS).order("archived").order("name");
  if (!includeArchived) query = query.eq("archived", false);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toAccount);
}

export async function getAccount(id: string): Promise<Account | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("account_balances").select(ACCOUNT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toAccount(data) : null;
}
