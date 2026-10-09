import "server-only";

/*
 * Market data providers. All calls run on the server, so the brapi token never
 * reaches the browser. Each returns null when the symbol does not exist and
 * throws on network or provider errors (the caller falls back to the cache).
 */

export type FetchedQuote = {
  price: number;
  currency: "BRL" | "USD";
  changePercent: number | null;
  name: string | null;
  logoUrl: string | null;
  marketTime: string | null;
};

const TIMEOUT_MS = 6000;

async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * brapi.dev: B3 stocks, FIIs, ETFs and US stocks. The free plan allows one
 * symbol per request and one request at a time (HTTP 429 otherwise), so
 * callers must not run these in parallel; a 429 is retried once.
 */
export async function fetchBrapiQuote(symbol: string): Promise<FetchedQuote | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) throw new Error("BRAPI_TOKEN is not set");

  const url = `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?token=${encodeURIComponent(token)}`;
  let { ok, status, body } = await getJson(url);
  if (status === 429) {
    await sleep(700);
    ({ ok, status, body } = await getJson(url));
  }
  if (body?.code === "NOT_FOUND" || status === 404) return null;
  if (!ok || !body?.results?.[0]) throw new Error(`brapi ${status}: ${body?.message ?? "no results"}`);

  const result = body.results[0];
  if (typeof result.regularMarketPrice !== "number") return null;
  return {
    price: result.regularMarketPrice,
    currency: result.currency === "USD" ? "USD" : "BRL",
    changePercent: typeof result.regularMarketChangePercent === "number" ? result.regularMarketChangePercent : null,
    name: result.longName || result.shortName || null,
    logoUrl: typeof result.logourl === "string" ? result.logourl : null,
    marketTime: result.regularMarketTime ?? null,
  };
}

/** CoinGecko: crypto prices in BRL, several coins per request. */
export async function fetchCoinGeckoQuotes(ids: string[]): Promise<Map<string, FetchedQuote>> {
  const quotes = new Map<string, FetchedQuote>();
  if (ids.length === 0) return quotes;

  const { ok, status, body } = await getJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(",")}` +
      "&vs_currencies=brl&include_24hr_change=true&include_last_updated_at=true",
  );
  if (!ok || !body) throw new Error(`CoinGecko ${status}`);

  for (const id of ids) {
    const coin = body[id];
    if (typeof coin?.brl !== "number") continue;
    quotes.set(id, {
      price: coin.brl,
      currency: "BRL",
      changePercent: typeof coin.brl_24h_change === "number" ? coin.brl_24h_change : null,
      name: null,
      logoUrl: null,
      marketTime: coin.last_updated_at ? new Date(coin.last_updated_at * 1000).toISOString() : null,
    });
  }
  return quotes;
}

/** CoinGecko search: the coin with this exact ticker and the best market cap rank. */
export async function searchCoin(ticker: string): Promise<{ id: string; name: string } | null> {
  const { ok, status, body } = await getJson(
    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`,
  );
  if (!ok || !body) throw new Error(`CoinGecko search ${status}`);

  const matches = (body.coins ?? [])
    .filter((coin: { symbol?: string }) => coin.symbol?.toUpperCase() === ticker.toUpperCase())
    .sort(
      (a: { market_cap_rank?: number }, b: { market_cap_rank?: number }) =>
        (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity),
    );
  return matches[0] ? { id: matches[0].id, name: matches[0].name } : null;
}

/** AwesomeAPI: US dollar in reais (bid). */
export async function fetchUsdBrl(): Promise<FetchedQuote> {
  const { ok, status, body } = await getJson("https://economia.awesomeapi.com.br/json/last/USD-BRL");
  const bid = Number(body?.USDBRL?.bid);
  if (!ok || !Number.isFinite(bid) || bid <= 0) throw new Error(`AwesomeAPI ${status}`);
  return {
    price: bid,
    currency: "BRL",
    changePercent: Number(body.USDBRL.pctChange) || null,
    name: "Dólar americano",
    logoUrl: null,
    marketTime: body.USDBRL.timestamp ? new Date(Number(body.USDBRL.timestamp) * 1000).toISOString() : null,
  };
}
