"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { emptyToUndefined, failed, fieldErrorsFrom, formValues, type FormState } from "@/lib/forms";
import { ASSET_CLASSES, normalizeTicker } from "@/lib/investments/classes";
import { lookupAsset } from "@/lib/investments/lookup";
import { formatQuantity, parseDecimal } from "@/lib/investments/numbers";
import { computePosition, OversellError, type Trade } from "@/lib/investments/position";
import { createClient } from "@/lib/supabase/server";

const decimal = (label: string, example: string) =>
  z.string({ error: `Informe ${label}.` }).transform((value, ctx) => {
    const number = parseDecimal(value);
    if (number === null || number <= 0 || number > 1e12) {
      ctx.addIssue({ code: "custom", message: `Informe ${label} maior que zero, como ${example}.` });
      return z.NEVER;
    }
    return number;
  });

const tradeSchema = z
  .object({
    tradeId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    assetId: z.preprocess(emptyToUndefined, z.uuid().optional()),
    assetClass: z.preprocess(emptyToUndefined, z.enum(ASSET_CLASSES).optional()),
    ticker: z.preprocess(emptyToUndefined, z.string().max(20).optional()),
    type: z.enum(["buy", "sell"], { error: "Escolha compra ou venda." }),
    quantity: decimal("a quantidade", "100 ou 0,015"),
    price: decimal("o preço", "36,50"),
    fees: z.preprocess(emptyToUndefined, z.string().optional()).transform((value, ctx) => {
      if (!value) return 0;
      const fees = parseDecimal(value, 2);
      if (fees === null) {
        ctx.addIssue({ code: "custom", message: "Informe as taxas como 4,90 ou deixe em branco." });
        return z.NEVER;
      }
      return fees;
    }),
    date: z.string().refine(isISODate, "Escolha uma data válida."),
  })
  .superRefine((data, ctx) => {
    if (!data.assetId && !data.assetClass) {
      ctx.addIssue({ code: "custom", path: ["assetClass"], message: "Escolha o tipo de ativo." });
    }
    if (!data.assetId && !data.ticker) {
      ctx.addIssue({ code: "custom", path: ["ticker"], message: "Informe o código do ativo, como PETR4." });
    }
  });

function revalidateInvestmentViews(assetId?: string) {
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  if (assetId) revalidatePath(`/investments/${assetId}`);
}

export async function saveTrade(state: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = tradeSchema.safeParse(values);
  if (!parsed.success) return failed(state, values, { fieldErrors: fieldErrorsFrom(parsed.error) });
  const data = parsed.data;

  if (data.date > todayISO()) {
    return failed(state, values, { fieldErrors: { date: "A operação não pode ser no futuro." } });
  }

  const user = await getCurrentUser();
  const supabase = await createClient();

  // Resolve the asset: an existing one, or create it after checking the ticker exists.
  let assetId = data.assetId;
  if (!assetId) {
    const assetClass = data.assetClass!;
    const ticker = normalizeTicker(assetClass, data.ticker!);
    const { data: existing } = await supabase
      .from("assets")
      .select("id")
      .eq("class", assetClass)
      .eq("ticker", ticker)
      .maybeSingle();

    if (existing) {
      assetId = existing.id;
    } else if (data.type === "sell") {
      return failed(state, values, {
        fieldErrors: { ticker: `Você ainda não tem ${ticker}. Registre a compra primeiro.` },
      });
    } else {
      const lookup = await lookupAsset(assetClass, ticker);
      if (!lookup.ok) return failed(state, values, { fieldErrors: { ticker: lookup.error } });
      const { data: created, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          class: assetClass,
          ticker,
          name: lookup.name.slice(0, 120),
          currency: lookup.currency,
          quote_source: lookup.quoteSource,
          quote_id: lookup.quoteId,
        })
        .select("id")
        .single();
      if (error) return failed(state, values, { error: "Não foi possível cadastrar o ativo agora." });
      assetId = created.id;
    }
  }

  // A sale can never leave the position negative at any date, including after edits.
  const { data: tradeRows, error: tradesError } = await supabase
    .from("asset_trades")
    .select("id, type, quantity, price, fees, date, created_at")
    .eq("asset_id", assetId);
  if (tradesError) return failed(state, values, { error: "Não foi possível salvar agora." });

  const trades: Trade[] = tradeRows
    .filter((t) => t.id !== data.tradeId)
    .map((t) => ({
      id: t.id,
      type: t.type,
      quantity: Number(t.quantity),
      price: Number(t.price),
      fees: Number(t.fees),
      date: t.date,
      createdAt: t.created_at,
    }));
  const candidate: Trade = {
    id: data.tradeId ?? "new",
    type: data.type,
    quantity: data.quantity,
    price: data.price,
    fees: data.fees,
    date: data.date,
    createdAt: "9999",
  };
  try {
    computePosition([...trades, candidate]);
  } catch (error) {
    if (error instanceof OversellError) {
      return failed(state, values, {
        fieldErrors: {
          quantity:
            error.available > 0
              ? `Em ${error.date.split("-").reverse().join("/")} você tinha ${formatQuantity(error.available)}. Não dá para vender mais que isso.`
              : "Não há posição deste ativo nessa data para vender.",
        },
      });
    }
    throw error;
  }

  const row = {
    type: data.type,
    quantity: data.quantity,
    price: data.price,
    fees: data.fees,
    date: data.date,
  };
  const { data: saved, error } = data.tradeId
    ? await supabase.from("asset_trades").update(row).eq("id", data.tradeId).select("id")
    : await supabase.from("asset_trades").insert({ ...row, user_id: user.id, asset_id: assetId }).select("id");

  if (error) return failed(state, values, { error: "Não foi possível salvar agora. Tente de novo em instantes." });
  if (saved.length === 0) return failed(state, values, { error: "Esta operação não existe mais." });

  revalidateInvestmentViews(assetId);
  redirect(`/investments/${assetId}`);
}

export async function deleteTrade(tradeId: string, assetId: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(tradeId).success || !z.uuid().safeParse(assetId).success) {
    return { error: "Operação inválida." };
  }
  await getCurrentUser();
  const supabase = await createClient();

  // Removing a buy must not leave a later sale without units.
  const { data: rows } = await supabase
    .from("asset_trades")
    .select("id, type, quantity, price, fees, date, created_at")
    .eq("asset_id", assetId);
  try {
    computePosition(
      (rows ?? [])
        .filter((t) => t.id !== tradeId)
        .map((t) => ({
          id: t.id,
          type: t.type,
          quantity: Number(t.quantity),
          price: Number(t.price),
          fees: Number(t.fees),
          date: t.date,
          createdAt: t.created_at,
        })),
    );
  } catch (error) {
    if (error instanceof OversellError) {
      return { error: "Excluir esta compra deixaria uma venda posterior sem cotas. Exclua a venda primeiro." };
    }
    throw error;
  }

  const { error } = await supabase.from("asset_trades").delete().eq("id", tradeId);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateInvestmentViews(assetId);
  redirect(`/investments/${assetId}`);
}

/** Deletes the asset and all of its trades. */
export async function deleteAsset(assetId: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(assetId).success) return { error: "Ativo inválido." };
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("assets").delete().eq("id", assetId);
  if (error) return { error: "Não foi possível excluir agora." };

  revalidateInvestmentViews();
  redirect("/investments");
}
