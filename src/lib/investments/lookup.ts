import "server-only";
import { ASSET_CLASS_INFO, type AssetClass } from "./classes";
import { fetchBrapiQuote, searchCoin } from "./providers";

export type AssetLookup =
  | { ok: true; name: string; currency: "BRL" | "USD"; quoteSource: "brapi" | "coingecko"; quoteId: string }
  | { ok: false; error: string };

/** Confirms a ticker exists in the right market and returns how to price it. */
export async function lookupAsset(assetClass: AssetClass, ticker: string): Promise<AssetLookup> {
  const info = ASSET_CLASS_INFO[assetClass];
  if (!info.pattern.test(ticker)) {
    return { ok: false, error: `Código inválido para ${info.label}. Exemplo: ${info.example}.` };
  }

  try {
    if (assetClass === "crypto") {
      const coin = await searchCoin(ticker);
      if (!coin) return { ok: false, error: `Não encontramos a criptomoeda ${ticker}.` };
      return { ok: true, name: coin.name, currency: "BRL", quoteSource: "coingecko", quoteId: coin.id };
    }

    const quote = await fetchBrapiQuote(ticker);
    if (!quote) return { ok: false, error: `Não encontramos ${ticker} na bolsa.` };
    if (quote.currency !== info.currency) {
      return {
        ok: false,
        error:
          info.currency === "USD"
            ? `${ticker} é negociado na B3. Escolha Ações, FIIs ou ETFs.`
            : `${ticker} é negociado em dólar. Escolha Exterior.`,
      };
    }
    return { ok: true, name: quote.name ?? ticker, currency: info.currency, quoteSource: "brapi", quoteId: ticker };
  } catch {
    return { ok: false, error: "Não conseguimos consultar a cotação agora. Tente de novo em instantes." };
  }
}
