"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { parseMoney } from "@/lib/format";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const ruleSchema = z
  .object({
    id: z.preprocess(emptyToUndefined, z.uuid().optional()),
    type: z.enum(["expense", "income"], { error: "Escolha despesa ou receita." }),
    amount: z.string({ error: "Informe o valor." }).transform((value, ctx) => {
      const amount = parseMoney(value);
      if (amount === null || amount <= 0 || amount > 999_999_999) {
        ctx.addIssue({ code: "custom", message: "Informe um valor maior que zero, como 1.450,00." });
        return z.NEVER;
      }
      return amount;
    }),
    description: z
      .string()
      .trim()
      .min(1, "Descreva a recorrência, por exemplo “Aluguel”.")
      .max(120, "Use no máximo 120 caracteres."),
    accountId: z.uuid({ error: "Escolha uma conta." }),
    categoryId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    dayOfMonth: z.coerce
      .number({ error: "Escolha o dia." })
      .int()
      .min(1, "Escolha um dia entre 1 e 31.")
      .max(31, "Escolha um dia entre 1 e 31."),
    startDate: z.string().refine(isISODate, "Escolha uma data válida."),
    endDate: z.preprocess(emptyToUndefined, z.string().refine(isISODate, "Escolha uma data válida.").optional()),
    active: z.preprocess((value) => value === "on", z.boolean()),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    path: ["endDate"],
    message: "O fim precisa ser depois do início.",
  });

function revalidateViews() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}

export async function saveRecurringRule(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = ruleSchema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });

  const user = await getCurrentUser();
  const supabase = await createClient();
  const data = parsed.data;

  if (data.categoryId) {
    const { data: category } = await supabase.from("categories").select("kind").eq("id", data.categoryId).maybeSingle();
    if (category?.kind !== data.type) {
      return failed(state, values, { fieldErrors: { categoryId: "Escolha uma categoria deste tipo." } });
    }
  }

  const row = {
    type: data.type,
    amount: data.amount,
    description: data.description,
    account_id: data.accountId,
    category_id: data.categoryId ?? null,
    day_of_month: data.dayOfMonth,
    start_date: data.startDate,
    end_date: data.endDate ?? null,
    active: data.active,
  };

  const { data: saved, error } = data.id
    ? await supabase.from("recurring_rules").update(row).eq("id", data.id).select("id")
    : await supabase.from("recurring_rules").insert({ ...row, user_id: user.id }).select("id");

  if (error) return failed(state, values, { error: "Não foi possível salvar agora. Tente de novo em instantes." });
  if (saved.length === 0) return failed(state, values, { error: "Esta recorrência não existe mais." });

  // Create any occurrence that is already due (for example, a start date in the past).
  await supabase.rpc("generate_my_recurring", { p_rule_id: saved[0].id });

  revalidateViews();
  redirect("/transactions/recurring");
}

/** Deleting a rule keeps the transactions it already created. */
export async function deleteRecurringRule(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Recorrência inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateViews();
  redirect("/transactions/recurring");
}
