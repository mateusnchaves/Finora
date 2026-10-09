import "server-only";
import { getCurrentUser } from "@/lib/auth";
import type { AssetClass } from "@/lib/investments/classes";
import { computePosition, type Position, type Trade } from "@/lib/investments/position";
import { getQuotes, quoteKey, USD_BRL, type Quote } from "@/lib/investments/quotes";
import { createClient } from "@/lib/supabase/server";

export type Asset = {
  id: string;
  class: AssetClass;
  ticker: string;
  name: string;
  currency: "BRL" | "USD";
  quoteSource: "brapi" | "coingecko";
  quoteId: string;
};

export type Holding = {
  asset: Asset;
  trades: Trade[];
  position: Position;
  quote: Quote | null;
  /** Converted to reais (US assets use today's dollar). Null without a quote. */
  valueBRL: number | null;
  investedBRL: number;
  resultBRL: number | null;
  resultPercent: number | null;
};

export type Portfolio = {
  holdings: Holding[];
  /** Assets with trades but nothing held anymore (fully sold). */
  closed: Holding[];
  totals: { value: number; invested: number; result: number; resultPercent: number; realized: number };
  allocation: { assetClass: AssetClass; value: number; share: number }[];
  usdBrl: Quote | null;
  updatedAt: string | null;
  hasStaleQuotes: boolean;
  missingQuotes: number;
  /** When the quotes were checked, to say "atualizadas há X min". */
  checkedAt: number;
};

type AssetRow = {
  id: string;
  class: AssetClass;
  ticker: string;
  name: string;
  currency: string;
  quote_source: string;
  quote_id: string;
};

function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    class: row.class,
    ticker: row.ticker,
    name: row.name,
    currency: row.currency === "USD" ? "USD" : "BRL",
    quoteSource: row.quote_source === "coingecko" ? "coingecko" : "brapi",
    quoteId: row.quote_id,
  };
}

const ASSET_COLUMNS = "id, class, ticker, name, currency, quote_source, quote_id";
const TRADE_COLUMNS = "id, asset_id, type, quantity, price, fees, date, created_at";

type TradeRow = {
  id: string;
  asset_id: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
  date: string;
  created_at: string;
};

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    type: row.type,
    quantity: Number(row.quantity),
    price: Number(row.price),
    fees: Number(row.fees),
    date: row.date,
    createdAt: row.created_at,
  };
}

function buildHolding(asset: Asset, trades: Trade[], quotes: Map<string, Quote>, usdBrl: number | null): Holding {
  const position = computePosition(trades);
  const quote = quotes.get(quoteKey(asset.quoteSource, asset.quoteId)) ?? null;
  const rate = asset.currency === "USD" ? usdBrl : 1;
  const investedBRL = rate === null ? 0 : position.invested * rate;
  const valueBRL = quote && rate !== null ? position.quantity * quote.price * rate : null;
  const resultBRL = valueBRL === null ? null : valueBRL - investedBRL;
  return {
    asset,
    trades,
    position,
    quote,
    valueBRL,
    investedBRL,
    resultBRL,
    resultPercent: resultBRL !== null && investedBRL > 0 ? (resultBRL / investedBRL) * 100 : null,
  };
}

/** The whole portfolio priced with cached or fresh quotes. */
export async function getPortfolio(): Promise<Portfolio> {
  await getCurrentUser();
  const supabase = await createClient();
  const [assetsResult, tradesResult] = await Promise.all([
    supabase.from("assets").select(ASSET_COLUMNS).order("ticker"),
    supabase.from("asset_trades").select(TRADE_COLUMNS).order("date"),
  ]);
  if (assetsResult.error) throw assetsResult.error;
  if (tradesResult.error) throw tradesResult.error;

  const assets = assetsResult.data.map(toAsset);
  const tradesByAsset = new Map<string, Trade[]>();
  for (const row of tradesResult.data) {
    const list = tradesByAsset.get(row.asset_id) ?? [];
    list.push(toTrade(row));
    tradesByAsset.set(row.asset_id, list);
  }

  const held = assets.filter((a) => computePosition(tradesByAsset.get(a.id) ?? []).quantity > 0);
  const needsUsd = held.some((a) => a.currency === "USD");
  const quotes = await getQuotes([
    ...held.map((a) => ({ source: a.quoteSource, quoteId: a.quoteId })),
    ...(needsUsd ? [USD_BRL] : []),
  ]);
  const usdBrl = needsUsd ? (quotes.get(quoteKey(USD_BRL.source, USD_BRL.quoteId)) ?? null) : null;

  const all = assets.map((a) => buildHolding(a, tradesByAsset.get(a.id) ?? [], quotes, usdBrl?.price ?? null));
  const holdings = all.filter((h) => h.position.quantity > 0);
  const closed = all.filter((h) => h.position.quantity === 0 && h.trades.length > 0);

  const value = holdings.reduce((sum, h) => sum + (h.valueBRL ?? h.investedBRL), 0);
  const invested = holdings.reduce((sum, h) => sum + h.investedBRL, 0);
  const realizedByCurrency = all.reduce(
    (sum, h) => sum + h.position.realized * (h.asset.currency === "USD" ? (usdBrl?.price ?? 0) : 1),
    0,
  );

  const byClass = new Map<AssetClass, number>();
  for (const h of holdings) {
    byClass.set(h.asset.class, (byClass.get(h.asset.class) ?? 0) + (h.valueBRL ?? h.investedBRL));
  }

  const priced = holdings.map((h) => h.quote).filter((q): q is Quote => q !== null);
  return {
    holdings,
    closed,
    totals: {
      value,
      invested,
      result: value - invested,
      resultPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
      realized: realizedByCurrency,
    },
    allocation: [...byClass]
      .map(([assetClass, classValue]) => ({ assetClass, value: classValue, share: value ? classValue / value : 0 }))
      .sort((a, b) => b.value - a.value),
    usdBrl,
    updatedAt: priced.map((q) => q.fetchedAt).sort()[0] ?? null,
    hasStaleQuotes: priced.some((q) => q.stale),
    missingQuotes: holdings.filter((h) => !h.quote).length,
    checkedAt: Date.now(),
  };
}

/** One asset with all its trades, priced. Null when it does not exist (or is not the user's). */
export async function getHolding(
  assetId: string,
): Promise<{ holding: Holding; usdBrl: Quote | null; checkedAt: number } | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const [assetResult, tradesResult] = await Promise.all([
    supabase.from("assets").select(ASSET_COLUMNS).eq("id", assetId).maybeSingle(),
    supabase.from("asset_trades").select(TRADE_COLUMNS).eq("asset_id", assetId).order("date", { ascending: false }),
  ]);
  if (assetResult.error) throw assetResult.error;
  if (tradesResult.error) throw tradesResult.error;
  if (!assetResult.data) return null;

  const asset = toAsset(assetResult.data);
  const quotes = await getQuotes([
    { source: asset.quoteSource, quoteId: asset.quoteId },
    ...(asset.currency === "USD" ? [USD_BRL] : []),
  ]);
  const usdBrl = asset.currency === "USD" ? (quotes.get(quoteKey(USD_BRL.source, USD_BRL.quoteId)) ?? null) : null;
  return {
    holding: buildHolding(asset, tradesResult.data.map(toTrade), quotes, usdBrl?.price ?? null),
    usdBrl,
    checkedAt: Date.now(),
  };
}

/** Assets for the trade form's "existing asset" picker. */
export async function getAssets(): Promise<Asset[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("assets").select(ASSET_COLUMNS).order("ticker");
  if (error) throw error;
  return data.map(toAsset);
}
