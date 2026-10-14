"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { installmentDate, MAX_INSTALLMENTS, splitInstallments } from "@/lib/credit-card";
import { isISODate, monthOf } from "@/lib/dates";
import { parseMoney } from "@/lib/format";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

const MAX_AMOUNT = 999_999_999.99;

const transactionSchema = z
  .object({
    id: z.preprocess(emptyToUndefined, z.uuid().optional()),
    type: z.enum(["expense", "income", "transfer"], { error: "Escolha o tipo do lançamento." }),
    amount: z
      .string({ error: "Informe o valor." })
      .transform((value, ctx) => {
        const amount = parseMoney(value);
        if (amount === null || amount <= 0) {
          ctx.addIssue({ code: "custom", message: "Informe um valor maior que zero, como 49,90." });
          return z.NEVER;
        }
        if (amount > MAX_AMOUNT) {
          ctx.addIssue({ code: "custom", message: "Valor alto demais." });
          return z.NEVER;
        }
        return amount;
      }),
    description: z
      .string()
      .trim()
      .min(1, "Descreva o lançamento, por exemplo “Mercado”.")
      .max(120, "Use no máximo 120 caracteres."),
    date: z.string().refine(isISODate, "Escolha uma data válida."),
    accountId: z.uuid({ error: "Escolha uma conta." }),
    transferAccountId: z.preprocess(emptyToUndefined, z.uuid({ error: "Escolha a conta de destino." }).optional()),
    categoryId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    notes: z.preprocess(emptyToUndefined, z.string().trim().max(500, "Use no máximo 500 caracteres.").optional()),
    repeatMonthly: z.preprocess((value) => value === "on", z.boolean()),
    installments: z.preprocess(
      (value) => (value === undefined || value === "" ? 1 : value),
      z.coerce.number().int().min(1).max(MAX_INSTALLMENTS, `Use até ${MAX_INSTALLMENTS} parcelas.`),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.type !== "transfer") return;
    if (!data.transferAccountId) {
      ctx.addIssue({ code: "custom", path: ["transferAccountId"], message: "Escolha a conta de destino." });
    } else if (data.transferAccountId === data.accountId) {
      ctx.addIssue({ code: "custom", path: ["transferAccountId"], message: "Escolha uma conta diferente da origem." });
    }
  });

function revalidateFinanceViews() {
  revalidatePath("/cards", "layout");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function saveTransaction(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = transactionSchema.safeParse(values);
  if (!parsed.success) {
    return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const data = parsed.data;
  const isTransfer = data.type === "transfer";

  // The category must be of the same kind as the transaction (an expense needs an expense category).
  if (!isTransfer && data.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("kind")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!category || category.kind !== data.type) {
      return failed(state, values, { fieldErrors: { categoryId: "Escolha uma categoria deste tipo." } });
    }
  }

  const row = {
    type: data.type,
    amount: data.amount,
    description: data.description,
    date: data.date,
    account_id: data.accountId,
    transfer_account_id: isTransfer ? data.transferAccountId! : null,
    category_id: isTransfer ? null : (data.categoryId ?? null),
    notes: data.notes ?? null,
  };

  if (!data.id && data.installments > 1) {
    return saveInstallments(state, values, { ...data, userId: user.id, row });
  }

  // "Repetir todo mês": the rule starts on this date and this transaction is its first occurrence.
  let recurringRuleId: string | null = null;
  if (!data.id && !isTransfer && data.repeatMonthly) {
    const { data: rule, error: ruleError } = await supabase
      .from("recurring_rules")
      .insert({
        user_id: user.id,
        type: data.type as "income" | "expense",
        account_id: data.accountId,
        category_id: data.categoryId ?? null,
        amount: data.amount,
        description: data.description,
        day_of_month: Number(data.date.slice(8, 10)),
        start_date: data.date,
      })
      .select("id")
      .single();
    if (ruleError) return failed(state, values, { error: "Não foi possível criar a recorrência agora." });
    recurringRuleId = rule.id;
  }

  // RLS hides other users' rows, so updating one of them simply matches nothing.
  const { data: saved, error } = data.id
    ? await supabase.from("transactions").update(row).eq("id", data.id).select("id")
    : await supabase
        .from("transactions")
        .insert({ ...row, user_id: user.id, recurring_rule_id: recurringRuleId })
        .select("id");

  if (error && recurringRuleId) {
    // Do not leave a rule behind for a transaction that was never saved.
    await supabase.from("recurring_rules").delete().eq("id", recurringRuleId);
  }
  if (!error && saved.length === 0) {
    return failed(state, values, { error: "Este lançamento não existe mais." });
  }
  if (error) {
    // 23503: the account or category does not exist for this user.
    const message =
      error.code === "23503"
        ? "A conta ou a categoria escolhida não existe mais. Recarregue a página."
        : "Não foi possível salvar agora. Tente de novo em instantes.";
    return failed(state, values, { error: message });
  }

  // Fill in any months already due after the first one (a past start date).
  if (recurringRuleId) await supabase.rpc("generate_my_recurring", { p_rule_id: recurringRuleId });

  revalidateFinanceViews();
  redirect(`/transactions?month=${monthOf(data.date)}`);
}

type ParsedTransaction = z.infer<typeof transactionSchema>;

/** "3x de R$ 100": one transaction per month on the card, linked by installment_group_id. */
async function saveInstallments(
  state: FormState,
  values: Record<string, string>,
  data: ParsedTransaction & { userId: string; row: Omit<TransactionInsert, "user_id"> },
): Promise<FormState> {
  const supabase = await createClient();
  if (data.type !== "expense") {
    return failed(state, values, { fieldErrors: { installments: "Só despesas podem ser parceladas." } });
  }
  if (data.repeatMonthly) {
    return failed(state, values, { fieldErrors: { installments: "Uma compra parcelada não se repete todo mês." } });
  }
  const { data: account } = await supabase.from("accounts").select("type").eq("id", data.accountId).maybeSingle();
  if (account?.type !== "credit_card") {
    return failed(state, values, { fieldErrors: { installments: "Parcele compras no cartão de crédito." } });
  }

  const groupId = crypto.randomUUID();
  const amounts = splitInstallments(data.amount, data.installments);
  const rows: TransactionInsert[] = amounts.map((amount, i) => ({
    ...data.row,
    user_id: data.userId,
    amount,
    date: installmentDate(data.date, i + 1),
    installment_group_id: groupId,
    installment_number: i + 1,
    installment_count: data.installments,
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return failed(state, values, { error: "Não foi possível salvar agora. Tente de novo em instantes." });

  revalidateFinanceViews();
  redirect(`/transactions?month=${monthOf(data.date)}`);
}

/** Deletes every installment of a purchase. */
export async function deleteInstallmentGroup(groupId: string, month: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(groupId).success) return { error: "Compra inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("installment_group_id", groupId);
  if (error) return { error: "Não foi possível excluir agora. Tente de novo em instantes." };

  revalidateFinanceViews();
  redirect(`/transactions?month=${/^\d{4}-\d{2}$/.test(month) ? month : ""}`);
}

export async function deleteTransaction(id: string, month: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Lançamento inválido." };

  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora. Tente de novo em instantes." };

  revalidateFinanceViews();
  redirect(`/transactions?month=${/^\d{4}-\d{2}$/.test(month) ? month : ""}`);
}
