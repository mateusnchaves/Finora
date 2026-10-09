"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { parseDecimal } from "@/lib/investments/numbers";
import { parseMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    id: z.preprocess(emptyToUndefined, z.uuid().optional()),
    name: z.string().trim().min(1, "Dê um nome, como “CDB Banco Inter”.").max(80, "Use no máximo 80 caracteres."),
    kind: z.enum(["cdb", "lci_lca", "tesouro_selic", "tesouro_prefixado", "tesouro_ipca", "debenture", "other"], {
      error: "Escolha o tipo de título.",
    }),
    index: z.enum(["cdi", "selic", "pre", "ipca"], { error: "Escolha a rentabilidade." }),
    rate: z.string({ error: "Informe a taxa." }).transform((value, ctx) => {
      const rate = parseDecimal(value, 4);
      if (rate === null || rate <= 0 || rate > 1000) {
        ctx.addIssue({ code: "custom", message: "Informe a taxa, como 110 ou 12,5." });
        return z.NEVER;
      }
      return rate;
    }),
    principal: z.string({ error: "Informe o valor aplicado." }).transform((value, ctx) => {
      const amount = parseMoney(value);
      if (amount === null || amount <= 0 || amount > 999_999_999) {
        ctx.addIssue({ code: "custom", message: "Informe o valor aplicado, como 5.000,00." });
        return z.NEVER;
      }
      return amount;
    }),
    startDate: z.string().refine(isISODate, "Escolha a data da aplicação."),
    maturityDate: z.preprocess(emptyToUndefined, z.string().refine(isISODate, "Escolha uma data válida.").optional()),
    taxExempt: z.preprocess((value) => value === "on", z.boolean()),
  })
  .superRefine((data, ctx) => {
    if (data.maturityDate && data.maturityDate <= data.startDate) {
      ctx.addIssue({ code: "custom", path: ["maturityDate"], message: "O vencimento precisa ser depois da aplicação." });
    }
    // Sanity check: a percentage of CDI/Selic under 50% or an annual rate over 50% is almost surely a typo.
    if ((data.index === "cdi" || data.index === "selic") && data.rate < 50) {
      ctx.addIssue({ code: "custom", path: ["rate"], message: "Para % do CDI, use algo como 100 ou 110." });
    }
    if ((data.index === "pre" || data.index === "ipca") && data.rate > 50) {
      ctx.addIssue({ code: "custom", path: ["rate"], message: "Use a taxa anual, como 12,5." });
    }
  });

function revalidateViews(id?: string) {
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/investments/fixed-income/${id}`);
}

export async function saveFixedIncome(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });
  const data = parsed.data;
  if (data.startDate > todayISO()) {
    return failed(state, values, { fieldErrors: { startDate: "A aplicação não pode ser no futuro." } });
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const row = {
    name: data.name,
    kind: data.kind,
    index: data.index,
    rate: data.rate,
    principal: data.principal,
    start_date: data.startDate,
    maturity_date: data.maturityDate ?? null,
    tax_exempt: data.taxExempt,
  };
  const { data: saved, error } = data.id
    ? await supabase.from("fixed_income").update(row).eq("id", data.id).select("id")
    : await supabase.from("fixed_income").insert({ ...row, user_id: user.id }).select("id");

  if (error) return failed(state, values, { error: "Não foi possível salvar agora. Tente de novo em instantes." });
  if (saved.length === 0) return failed(state, values, { error: "Esta aplicação não existe mais." });

  revalidateViews(saved[0].id);
  redirect(`/investments/fixed-income/${saved[0].id}`);
}

export async function deleteFixedIncome(id: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(id).success) return { error: "Aplicação inválida." };
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("fixed_income").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateViews();
  redirect("/investments");
}
