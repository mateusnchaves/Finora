"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isISODate, monthOf } from "@/lib/dates";
import { decodeBankFile } from "@/lib/import/amount";
import { buildHistory, suggestCategory } from "@/lib/import/categorize";
import { findDuplicates, type DuplicateReason } from "@/lib/import/duplicates";
import { parseCsv } from "@/lib/import/parse-csv";
import { looksLikeOfx, parseOfx } from "@/lib/import/parse-ofx";
import { ImportFormatError, MAX_IMPORT_ROWS, type ParseResult } from "@/lib/import/types";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 900 * 1024;

export type PreviewRow = {
  key: number;
  date: string;
  description: string;
  amount: number; // positive
  type: "income" | "expense";
  externalId?: string;
  categoryId: string | null;
  suggestion: "history" | "keyword" | null;
  duplicate: DuplicateReason;
};

export type ImportPreview = {
  accountId: string;
  accountName: string;
  fileName: string;
  format: "ofx" | "csv";
  skipped: number;
  truncated: boolean;
  rows: PreviewRow[];
};

export type PreviewState = { error?: string; preview?: ImportPreview };

/** Step 1: read the file, suggest categories and flag likely duplicates. Nothing is saved. */
export async function previewImport(_state: PreviewState, formData: FormData): Promise<PreviewState> {
  const accountId = z.uuid().safeParse(formData.get("accountId"));
  if (!accountId.success) return { error: "Escolha a conta do extrato." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha um arquivo OFX ou CSV." };
  if (file.size > MAX_FILE_BYTES) return { error: "O arquivo passa de 900 KB. Exporte um período menor." };
  if (!/\.(ofx|csv|txt)$/i.test(file.name)) return { error: "Use um arquivo .ofx ou .csv." };

  await getCurrentUser();
  const supabase = await createClient();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("id", accountId.data)
    .maybeSingle();
  if (!account) return { error: "Esta conta não existe mais." };

  let parsed: ParseResult;
  try {
    const text = decodeBankFile(await file.arrayBuffer());
    parsed = looksLikeOfx(text)
      ? parseOfx(text)
      : parseCsv(text, { positiveIsExpense: formData.get("positiveIsExpense") === "on" });
  } catch (error) {
    if (error instanceof ImportFormatError) return { error: error.message };
    return { error: "Não conseguimos ler este arquivo. Confira se é um OFX ou CSV exportado do banco." };
  }
  if (parsed.rows.length === 0) return { error: "Não encontramos lançamentos neste arquivo." };

  const rows = parsed.rows.slice(0, MAX_IMPORT_ROWS);
  const dates = rows.map((r) => r.date).sort();

  const [categoriesResult, historyResult, existingResult] = await Promise.all([
    supabase.from("categories").select("id, name, kind"),
    supabase.rpc("category_history"),
    supabase
      .from("transactions")
      .select("date, amount, type, description, external_id")
      .eq("account_id", account.id)
      .gte("date", dates[0])
      .lte("date", dates.at(-1)!),
  ]);
  if (categoriesResult.error || historyResult.error || existingResult.error) {
    return { error: "Não foi possível preparar a importação agora. Tente de novo em instantes." };
  }

  const categories = categoriesResult.data;
  const history = buildHistory(
    historyResult.data.map((h) => ({
      description: h.description,
      categoryId: h.category_id,
      kind: h.kind,
      count: h.transaction_count,
    })),
  );
  const duplicates = findDuplicates(
    rows,
    existingResult.data.map((t) => ({
      date: t.date,
      amount: Number(t.amount),
      type: t.type,
      description: t.description,
      externalId: t.external_id,
    })),
  );

  return {
    preview: {
      accountId: account.id,
      accountName: account.name,
      fileName: file.name,
      format: parsed.format,
      skipped: parsed.skipped,
      truncated: parsed.rows.length > MAX_IMPORT_ROWS,
      rows: rows.map((row, key) => {
        const type = row.amount < 0 ? "expense" : "income";
        const suggestion = suggestCategory(row.description, type, history, categories);
        return {
          key,
          date: row.date,
          description: row.description.replace(/\s+/g, " ").trim().slice(0, 120),
          amount: Math.abs(row.amount),
          type,
          externalId: row.externalId?.slice(0, 200),
          categoryId: suggestion?.categoryId ?? null,
          suggestion: suggestion?.source ?? null,
          duplicate: duplicates[key],
        };
      }),
    },
  };
}

const confirmSchema = z.object({
  accountId: z.uuid(),
  rows: z
    .array(
      z.object({
        date: z.string().refine(isISODate),
        description: z.string().trim().min(1).max(120),
        amount: z.number().positive().max(999_999_999.99),
        type: z.enum(["income", "expense"]),
        categoryId: z.uuid().nullable(),
        externalId: z.string().max(200).optional(),
      }),
    )
    .min(1, "Selecione ao menos um lançamento.")
    .max(MAX_IMPORT_ROWS),
});

export type ConfirmResult = { error?: string; imported?: number; batchId?: string; month?: string };

/** Step 2: save the rows the user kept, tagged with one import batch id so they can be undone. */
export async function confirmImport(input: z.input<typeof confirmSchema>): Promise<ConfirmResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados de importação inválidos." };

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { accountId, rows } = parsed.data;

  // Keep a category only when it is the user's and matches the row's direction.
  const { data: categories } = await supabase.from("categories").select("id, kind");
  const kinds = new Map((categories ?? []).map((c) => [c.id, c.kind]));

  const batchId = crypto.randomUUID();
  const { error } = await supabase.from("transactions").insert(
    rows.map((row) => ({
      user_id: user.id,
      account_id: accountId,
      type: row.type,
      amount: Math.round(row.amount * 100) / 100,
      date: row.date,
      description: row.description,
      category_id: row.categoryId && kinds.get(row.categoryId) === row.type ? row.categoryId : null,
      external_id: row.externalId ?? null,
      import_batch_id: batchId,
    })),
  );

  if (error) {
    if (error.code === "23505") {
      return { error: "Alguns destes lançamentos já foram importados. Envie o arquivo de novo para revisar." };
    }
    if (error.code === "23503") return { error: "A conta escolhida não existe mais." };
    return { error: "Não foi possível importar agora. Tente de novo em instantes." };
  }

  revalidateImportViews();
  const latest = rows.map((r) => r.date).sort().at(-1)!;
  return { imported: rows.length, batchId, month: monthOf(latest) };
}

/** Removes every transaction created by one import. */
export async function undoImport(batchId: string): Promise<{ error?: string; removed?: number }> {
  if (!z.uuid().safeParse(batchId).success) return { error: "Importação inválida." };

  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("transactions").delete().eq("import_batch_id", batchId).select("id");
  if (error) return { error: "Não foi possível desfazer agora." };

  revalidateImportViews();
  return { removed: data.length };
}

function revalidateImportViews() {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}
