/*
 * Sample data used while the database is not wired up (Phase 0).
 * Replaced by Supabase queries and the demo account seed in later phases.
 */

export type Transaction = {
  id: string;
  description: string;
  category: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // always positive
  type: "income" | "expense";
};

export const SAMPLE_MONTH = { year: 2026, month: 10 };

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  { id: "1", description: "Mercado Pão Quente", category: "Alimentação", date: "2026-10-06", amount: 184.3, type: "expense" },
  { id: "2", description: "Salário", category: "Receita", date: "2026-10-05", amount: 4200, type: "income" },
  { id: "3", description: "Aluguel", category: "Moradia", date: "2026-10-05", amount: 1100, type: "expense" },
  { id: "4", description: "Recarga bilhete único", category: "Transporte", date: "2026-10-03", amount: 90, type: "expense" },
  { id: "5", description: "Restaurante Nonna Rosa", category: "Alimentação", date: "2026-10-03", amount: 126.5, type: "expense" },
  { id: "6", description: "Assinatura de streaming", category: "Lazer", date: "2026-10-02", amount: 39.9, type: "expense" },
  { id: "7", description: "Farmácia", category: "Saúde", date: "2026-10-01", amount: 95.5, type: "expense" },
  { id: "8", description: "Freela de design", category: "Receita", date: "2026-10-01", amount: 650, type: "income" },
];

/** Expense total of the previous month, for the "a menos que em setembro" line. */
export const SAMPLE_PREVIOUS_MONTH_EXPENSES = 1948;

/** Balance carried over from before the sample month. */
export const SAMPLE_OPENING_BALANCE = 8996.9;
