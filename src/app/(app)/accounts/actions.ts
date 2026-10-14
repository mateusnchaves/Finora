"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { parseMoney } from "@/lib/format";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const dayField = (message: string) =>
  z.preprocess(emptyToUndefined, z.coerce.number({ error: message }).int(message).min(1, message).max(31, message).optional());

const accountSchema = z
  .object({
  id: z.preprocess(emptyToUndefined, z.uuid().optional()),
  name: z.string().trim().min(1, "Dê um nome à conta, como “Nubank”.").max(60, "Use no máximo 60 caracteres."),
  type: z.enum(["checking", "savings", "wallet", "credit_card"], { error: "Escolha o tipo da conta." }),
  // Accepts a leading minus for accounts that start in the red.
  initialBalance: z.preprocess(emptyToUndefined, z.string().optional()).transform((value, ctx) => {
    if (!value) return 0;
    const negative = /^\s*[-−]/.test(value);
    const amount = parseMoney(value.replace(/^\s*[-−]/, ""));
    if (amount === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor como 1.250,00." });
      return z.NEVER;
    }
    return negative ? -amount : amount;
  }),
  archived: z.preprocess((value) => value === "on", z.boolean()),
  closingDay: dayField("Use um dia entre 1 e 31."),
  dueDay: dayField("Use um dia entre 1 e 31."),
  creditLimit: z.preprocess(emptyToUndefined, z.string().optional()).transform((value, ctx) => {
    if (!value) return undefined;
    const amount = parseMoney(value);
    if (amount === null || amount <= 0) {
      ctx.addIssue({ code: "custom", message: "Informe um limite como 5.000,00." });
      return z.NEVER;
    }
    return amount;
  }),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "credit_card") return;
    // Bills need both days.
    if (!data.closingDay) ctx.addIssue({ code: "custom", path: ["closingDay"], message: "Informe o dia em que a fatura fecha." });
    if (!data.dueDay) ctx.addIssue({ code: "custom", path: ["dueDay"], message: "Informe o dia do vencimento." });
  });

function revalidateAccountViews() {
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/cards", "layout");
}

export async function saveAccount(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = accountSchema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { id, name, type, initialBalance, archived, closingDay, dueDay, creditLimit } = parsed.data;
  const isCard = type === "credit_card";
  const row = {
    name,
    type,
    initial_balance: initialBalance,
    archived,
    closing_day: isCard ? closingDay! : null,
    due_day: isCard ? dueDay! : null,
    credit_limit: isCard ? (creditLimit ?? null) : null,
  };

  const { data: saved, error } = id
    ? await supabase.from("accounts").update(row).eq("id", id).select("id")
    : await supabase.from("accounts").insert({ ...row, user_id: user.id }).select("id");

  if (error) return failed(state, values, { error: "Não foi possível salvar agora. Tente de novo em instantes." });
  if (saved.length === 0) return failed(state, values, { error: "Esta conta não existe mais." });

  revalidateAccountViews();
  redirect("/accounts");
}

/** Only empty accounts can be deleted; deleting would erase their history. */
export async function deleteAccount(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Conta inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .or(`account_id.eq.${id},transfer_account_id.eq.${id}`);
  if (countError) return { error: "Não foi possível excluir agora. Tente de novo em instantes." };
  if (count) {
    return { error: "Esta conta tem lançamentos. Arquive a conta para escondê-la sem perder o histórico." };
  }

  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora. Tente de novo em instantes." };

  revalidateAccountViews();
  redirect("/accounts");
}
