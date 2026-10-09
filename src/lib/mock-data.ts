import type { TransactionItem } from "@/lib/data/types";

/*
 * Sample data for the dashboard until it reads from Supabase (Phase 3).
 */

export const SAMPLE_MONTH = { year: 2026, month: 10 };

function sample(
  id: string,
  description: string,
  categoryName: string,
  date: string,
  amount: number,
  type: "income" | "expense",
): TransactionItem {
  return {
    id,
    type,
    amount,
    date,
    description,
    notes: null,
    accountId: "sample",
    accountName: "Conta principal",
    transferAccountId: null,
    transferAccountName: null,
    categoryId: null,
    categoryName,
  };
}

export const SAMPLE_TRANSACTIONS: TransactionItem[] = [
  sample("1", "Mercado Pão Quente", "Alimentação", "2026-10-06", 184.3, "expense"),
  sample("2", "Salário", "Salário", "2026-10-05", 4200, "income"),
  sample("3", "Aluguel", "Moradia", "2026-10-05", 1100, "expense"),
  sample("4", "Recarga bilhete único", "Transporte", "2026-10-03", 90, "expense"),
  sample("5", "Restaurante Nonna Rosa", "Alimentação", "2026-10-03", 126.5, "expense"),
  sample("6", "Assinatura de streaming", "Lazer", "2026-10-02", 39.9, "expense"),
  sample("7", "Farmácia", "Saúde", "2026-10-01", 95.5, "expense"),
  sample("8", "Freela de design", "Freelance", "2026-10-01", 650, "income"),
];

/** Expense total of the previous month, for the "a menos que em setembro" line. */
export const SAMPLE_PREVIOUS_MONTH_EXPENSES = 1948;

/** Balance carried over from before the sample month. */
export const SAMPLE_OPENING_BALANCE = 8996.9;
