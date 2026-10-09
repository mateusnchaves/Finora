import type { IconName } from "@/components/ui/icon";
import type { Database } from "@/lib/supabase/database.types";

export type AssetClass = Database["public"]["Enums"]["asset_class"];

export const ASSET_CLASSES: AssetClass[] = ["stock_br", "fii", "etf", "stock_us", "crypto"];

export const ASSET_CLASS_INFO: Record<
  AssetClass,
  { label: string; singular: string; icon: IconName; example: string; currency: "BRL" | "USD"; pattern: RegExp }
> = {
  stock_br: {
    label: "Ações",
    singular: "Ação",
    icon: "candlestick_chart",
    example: "PETR4",
    currency: "BRL",
    pattern: /^[A-Z]{4}\d{1,2}$/,
  },
  fii: { label: "FIIs", singular: "FII", icon: "apartment", example: "MXRF11", currency: "BRL", pattern: /^[A-Z]{4}11$/ },
  etf: { label: "ETFs", singular: "ETF", icon: "stacked_line_chart", example: "BOVA11", currency: "BRL", pattern: /^[A-Z]{4}11$/ },
  stock_us: {
    label: "Exterior",
    singular: "Ação dos EUA",
    icon: "public",
    example: "AAPL",
    currency: "USD",
    pattern: /^[A-Z][A-Z.-]{0,9}$/,
  },
  crypto: {
    label: "Cripto",
    singular: "Criptomoeda",
    icon: "currency_bitcoin",
    example: "BTC",
    currency: "BRL",
    pattern: /^[A-Z0-9]{2,10}$/,
  },
};

/** "petr4f " -> "PETR4" (the fractional-market F suffix is the same asset). */
export function normalizeTicker(assetClass: AssetClass, input: string): string {
  const ticker = input.trim().toUpperCase();
  if (assetClass === "stock_br" && /^[A-Z]{4}\d{1,2}F$/.test(ticker)) return ticker.slice(0, -1);
  return ticker;
}
