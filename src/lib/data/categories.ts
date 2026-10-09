import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "./types";

/** The user's categories, sorted by name (pt-BR collation). */
export async function getCategories(): Promise<Category[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name, kind");
  if (error) throw error;
  return data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Number of transactions per category id, to warn before deleting one. */
export async function getCategoryUsage(): Promise<Map<string, number>> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("category_usage").select("category_id, transaction_count");
  if (error) throw error;
  return new Map(data.map((row) => [row.category_id!, row.transaction_count ?? 0]));
}
