import type { Database } from "@/lib/supabase/database.types";

export type AccountType = Database["public"]["Enums"]["account_type"];
export type CategoryKind = Database["public"]["Enums"]["category_kind"];
export type TransactionType = Database["public"]["Enums"]["transaction_type"];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
  archived: boolean;
  transactionCount: number;
  /** Credit cards only; null until the user fills them in. */
  closingDay: number | null;
  dueDay: number | null;
  creditLimit: number | null;
};

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
};

export type TransactionItem = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  accountId: string;
  accountName: string;
  transferAccountId: string | null;
  transferAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  credit_card: "Cartão de crédito",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
};
