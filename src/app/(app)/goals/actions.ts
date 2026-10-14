"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { formatMoney, parseMoney } from "@/lib/format";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { GOAL_ICONS } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";

const MAX_AMOUNT = 999_999_999.99;

const money = (message: string) =>
  z.string({ error: message }).transform((value, ctx) => {
    const amount = parseMoney(value);
    if (amount === null || amount <= 0 || amount > MAX_AMOUNT) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return amount;
  });

const goalSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  name: z.string().trim().min(1, "Dê um nome à meta, como “Viagem”.").max(60, "Use no máximo 60 caracteres."),
  icon: z.enum(GOAL_ICONS, { error: "Escolha um ícone." }),
  targetAmount: money("Informe quanto quer juntar, como 5.000,00."),
  targetDate: z.preprocess(
    emptyToUndefined,
    z.string().refine(isISODate, "Escolha uma data válida.").optional(),
  ),
  accountId: z.preprocess(emptyToUndefined, z.uuid().optional()),
});

const contributionSchema = z.object({
  direction: z.enum(["in", "out"]),
  amount: money("Informe um valor maior que zero, como 200,00."),
  date: z.string().refine(isISODate, "Escolha uma data válida."),
  note: z.preprocess(emptyToUndefined, z.string().trim().max(120, "Use no máximo 120 caracteres.").optional()),
});

function revalidateGoalViews(id?: string) {
  revalidatePath("/goals");
  if (id) revalidatePath(`/goals/${id}`);
  revalidatePath("/dashboard");
}

export async function saveGoal(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = goalSchema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { id, name, icon, targetAmount, targetDate, accountId } = parsed.data;

  // A new goal starts today, so its deadline cannot be in the past.
  if (!id && targetDate && targetDate < todayISO()) {
    return failed(state, values, { fieldErrors: { targetDate: "Escolha uma data a partir de hoje." } });
  }

  const row = { name, icon, target_amount: targetAmount, target_date: targetDate ?? null, account_id: accountId ?? null };
  const { data: saved, error } = id
    ? await supabase.from("goals").update(row).eq("id", id).select("id")
    : await supabase.from("goals").insert({ ...row, user_id: user.id }).select("id");

  if (error) {
    // 23514: the deadline is before the goal's start date.
    const message =
      error.code === "23514"
        ? "O prazo precisa ser depois do início da meta."
        : error.code === "23503"
          ? "A conta escolhida não existe mais."
          : "Não foi possível salvar agora. Tente de novo em instantes.";
    return failed(state, values, { error: message });
  }
  if (saved.length === 0) return failed(state, values, { error: "Esta meta não existe mais." });

  revalidateGoalViews(saved[0].id);
  redirect(`/goals/${saved[0].id}`);
}

export async function deleteGoal(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Meta inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora. Tente de novo em instantes." };

  revalidateGoalViews();
  redirect("/goals");
}

/** Sets money aside for a goal ("in") or takes some back ("out"), never below zero. */
export async function addContribution(goalId: string, state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  if (!z.uuid().safeParse(goalId).success) return failed(state, values, { error: "Meta inválida." });
  const parsed = contributionSchema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { direction, amount, date, note } = parsed.data;

  if (direction === "out") {
    const { data: goal } = await supabase.from("goal_progress").select("saved").eq("id", goalId).maybeSingle();
    const saved = Number(goal?.saved ?? 0);
    if (amount > saved) {
      return failed(state, values, {
        fieldErrors: { amount: `A meta tem ${formatMoney(saved)} guardados; retire no máximo esse valor.` },
      });
    }
  }

  const { error } = await supabase.from("goal_contributions").insert({
    user_id: user.id,
    goal_id: goalId,
    amount: direction === "out" ? -amount : amount,
    date,
    note: note ?? null,
  });
  if (error) {
    const message = error.code === "23503" ? "Esta meta não existe mais." : "Não foi possível salvar agora.";
    return failed(state, values, { error: message });
  }

  revalidateGoalViews(goalId);
  // A fresh state clears the form for the next entry.
  return { attempt: (state.attempt ?? 0) + 1 };
}

export async function deleteContribution(id: string, goalId: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(goalId).success) return { error: "Item inválido." };

  await getCurrentUser();
  const supabase = await createClient();

  // Removing a deposit cannot leave the goal below zero.
  const [{ data: goal }, { data: contribution }] = await Promise.all([
    supabase.from("goal_progress").select("saved").eq("id", goalId).maybeSingle(),
    supabase.from("goal_contributions").select("amount").eq("id", id).maybeSingle(),
  ]);
  if (!contribution) return { error: "Este item não existe mais." };
  if (Number(goal?.saved ?? 0) - Number(contribution.amount) < 0) {
    return { error: "Exclua antes a retirada que depende deste valor." };
  }

  const { error } = await supabase.from("goal_contributions").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateGoalViews(goalId);
  return {};
}
