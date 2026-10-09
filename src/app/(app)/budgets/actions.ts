"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { parseMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type BudgetActionState = { error?: string; ok?: number };

const amountSchema = z.string({ error: "Informe o limite." }).transform((value, ctx) => {
  const amount = parseMoney(value);
  if (amount === null || amount <= 0 || amount > 999_999_999) {
    ctx.addIssue({ code: "custom", message: "Informe um limite maior que zero, como 800,00." });
    return z.NEVER;
  }
  return amount;
});

function revalidateBudgetViews() {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function createBudget(state: BudgetActionState, formData: FormData): Promise<BudgetActionState> {
  const categoryId = z.uuid({ error: "Escolha uma categoria." }).safeParse(formData.get("categoryId"));
  if (!categoryId.success) return { error: "Escolha uma categoria." };
  const amount = amountSchema.safeParse(formData.get("amount"));
  if (!amount.success) return { error: amount.error.issues[0].message };

  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("kind")
    .eq("id", categoryId.data)
    .maybeSingle();
  if (category?.kind !== "expense") return { error: "Orçamentos valem só para categorias de despesa." };

  const { error } = await supabase
    .from("budgets")
    .insert({ user_id: user.id, category_id: categoryId.data, amount: amount.data });
  if (error) {
    return {
      error: error.code === "23505" ? "Esta categoria já tem um orçamento." : "Não foi possível salvar agora.",
    };
  }

  revalidateBudgetViews();
  return { ok: (state.ok ?? 0) + 1 };
}

export async function updateBudget(
  id: string,
  state: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  if (!z.uuid().safeParse(id).success) return { error: "Orçamento inválido." };
  const amount = amountSchema.safeParse(formData.get("amount"));
  if (!amount.success) return { error: amount.error.issues[0].message };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").update({ amount: amount.data }).eq("id", id);
  if (error) return { error: "Não foi possível salvar agora." };

  revalidateBudgetViews();
  return { ok: (state.ok ?? 0) + 1 };
}

export async function deleteBudget(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Orçamento inválido." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateBudgetViews();
  return {};
}
