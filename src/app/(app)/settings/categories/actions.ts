"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { CategoryKind } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export type CategoryActionState = { error?: string; ok?: number };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Escreva um nome para a categoria.")
  .max(40, "Use no máximo 40 caracteres.");

const DUPLICATE = "23505";

function revalidateCategoryViews() {
  revalidatePath("/settings/categories");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

export async function createCategory(
  kind: CategoryKind,
  state: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  if (kind !== "income" && kind !== "expense") return { error: "Tipo de categoria inválido." };
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ user_id: user.id, kind, name: parsed.data });
  if (error) {
    return {
      error: error.code === DUPLICATE ? "Já existe uma categoria com esse nome." : "Não foi possível salvar agora.",
    };
  }

  revalidateCategoryViews();
  return { ok: (state.ok ?? 0) + 1 };
}

export async function renameCategory(
  id: string,
  state: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  if (!z.uuid().safeParse(id).success) return { error: "Categoria inválida." };
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name: parsed.data }).eq("id", id);
  if (error) {
    return {
      error: error.code === DUPLICATE ? "Já existe uma categoria com esse nome." : "Não foi possível salvar agora.",
    };
  }

  revalidateCategoryViews();
  return { ok: (state.ok ?? 0) + 1 };
}

/** Transactions keep existing and become "Sem categoria" (FK on delete set null). */
export async function deleteCategory(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Categoria inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateCategoryViews();
  return {};
}
