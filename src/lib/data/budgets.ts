import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { monthRange } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type BudgetProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  spent: number;
};

/** Every budget with what was spent in the month, closest to the limit first. */
export async function getBudgetProgress(month: string): Promise<BudgetProgress[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { start, end } = monthRange(month);
  const { data, error } = await supabase.rpc("budget_progress", { p_from: start, p_to: end });
  if (error) throw error;
  return data.map((row) => ({
    id: row.budget_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    amount: Number(row.amount),
    spent: Number(row.spent),
  }));
}
