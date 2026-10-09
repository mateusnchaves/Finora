import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchBrapiQuote, fetchCoinGeckoQuotes, fetchUsdBrl, type FetchedQuote } from "./providers";

/** How long a cached price is considered fresh. */
const MAX_AGE_MS = 15 * 60 * 1000;

export type Quote = FetchedQuote & {
  fetchedAt: string;
  /** True when the provider failed and this is an older cached price. */
  stale: boolean;
};

type Source = "brapi" | "coingecko" | "fx";
export type QuoteKey = { source: Source; quoteId: string };

const keyOf = (source: string, quoteId: string) => `${source}:${quoteId}`;

/**
 * Prices for the given symbols: fresh cache entries are used as they are,
 * the rest are fetched from the providers (brapi one symbol at a time,
 * CoinGecko in one batch) and written back to the shared cache.
 * When a provider fails, the last cached price is returned with `stale: true`.
 */
export async function getQuotes(keys: QuoteKey[]): Promise<Map<string, Quote>> {
  const unique = [...new Map(keys.map((k) => [keyOf(k.source, k.quoteId), k])).values()];
  const result = new Map<string, Quote>();
  if (unique.length === 0) return result;

  const supabase = await createClient();
  const { data: cached } = await supabase
    .from("quotes")
    .select("source, quote_id, price, currency, change_percent, name, logo_url, market_time, fetched_at")
    .in(
      "quote_id",
      unique.map((k) => k.quoteId),
    );

  const cache = new Map((cached ?? []).map((row) => [keyOf(row.source, row.quote_id), row]));
  const now = Date.now();
  const toFetch: QuoteKey[] = [];

  for (const key of unique) {
    const row = cache.get(keyOf(key.source, key.quoteId));
    if (row) {
      result.set(keyOf(key.source, key.quoteId), {
        price: Number(row.price),
        currency: row.currency === "USD" ? "USD" : "BRL",
        changePercent: row.change_percent === null ? null : Number(row.change_percent),
        name: row.name,
        logoUrl: row.logo_url,
        marketTime: row.market_time,
        fetchedAt: row.fetched_at,
        stale: false,
      });
    }
    if (!row || now - new Date(row.fetched_at).getTime() > MAX_AGE_MS) toFetch.push(key);
  }

  if (toFetch.length === 0) return result;

  const fetched = new Map<string, FetchedQuote>();
  const failed = new Set<string>();

  const brapi = toFetch.filter((k) => k.source === "brapi");
  const coins = toFetch.filter((k) => k.source === "coingecko");
  const fx = toFetch.filter((k) => k.source === "fx");

  await Promise.all([
    // brapi's free plan rejects concurrent requests, so its symbols go one at a time.
    (async () => {
      for (const k of brapi) {
        try {
          const quote = await fetchBrapiQuote(k.quoteId);
          if (quote) fetched.set(keyOf(k.source, k.quoteId), quote);
        } catch (error) {
          console.warn(`[quotes] brapi ${k.quoteId} failed:`, error instanceof Error ? error.message : error);
          failed.add(keyOf(k.source, k.quoteId));
        }
      }
    })(),
    (async () => {
      if (coins.length === 0) return;
      try {
        const quotes = await fetchCoinGeckoQuotes(coins.map((k) => k.quoteId));
        for (const [id, quote] of quotes) fetched.set(keyOf("coingecko", id), quote);
      } catch (error) {
        console.warn("[quotes] CoinGecko failed:", error instanceof Error ? error.message : error);
        for (const k of coins) failed.add(keyOf(k.source, k.quoteId));
      }
    })(),
    ...fx.map(async (k) => {
      try {
        fetched.set(keyOf(k.source, k.quoteId), await fetchUsdBrl());
      } catch (error) {
        console.warn("[quotes] AwesomeAPI failed:", error instanceof Error ? error.message : error);
        failed.add(keyOf(k.source, k.quoteId));
      }
    }),
  ]);

  const fetchedAt = new Date().toISOString();
  for (const [key, quote] of fetched) result.set(key, { ...quote, fetchedAt, stale: false });
  for (const key of failed) {
    const previous = result.get(key);
    if (previous) result.set(key, { ...previous, stale: true });
  }

  if (fetched.size > 0) {
    const rows = [...fetched].map(([key, quote]) => {
      const [source, ...rest] = key.split(":");
      return {
        source,
        quote_id: rest.join(":"),
        price: quote.price,
        currency: quote.currency,
        change_percent: quote.changePercent,
        name: quote.name,
        logo_url: quote.logoUrl,
        market_time: quote.marketTime,
        fetched_at: fetchedAt,
      };
    });
    // The cache is shared, so it is written with the privileged client.
    await createAdminClient().from("quotes").upsert(rows);
  }

  return result;
}

export function quoteKey(source: string, quoteId: string) {
  return keyOf(source, quoteId);
}

export const USD_BRL: QuoteKey = { source: "fx", quoteId: "USD-BRL" };
