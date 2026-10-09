/*
 * Number input and output for investments, where quantities and prices can
 * have up to 8 decimals (crypto) and prices can be in dollars.
 */

/** "0,015", "1.234,5678", "100", "340.42", "1.000" -> number. Null when invalid. */
export function parseDecimal(input: string, maxDecimals = 8): number | null {
  let text = input.replace(/R\$|US\$|\$|\s| /g, "");
  if (!text) return null;

  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }

  if (!new RegExp(`^\\d+(\\.\\d{1,${maxDecimals}})?$`).test(text)) return null;
  return Number(text);
}

const quantityFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 });

/** 100 -> "100", 0.015 -> "0,015" */
export function formatQuantity(value: number): string {
  return quantityFormat.format(value);
}

/** Value for a decimal input field: 0.015 -> "0,015", 36.5 -> "36,50" for prices. */
export function formatDecimalInput(value: number, minDecimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: 8,
    useGrouping: false,
  }).format(value);
}

/** "R$ 1.234,56" or "US$ 340,42"; tiny crypto prices keep more decimals. */
export function formatPrice(value: number, currency: "BRL" | "USD"): string {
  const decimals = Math.abs(value) > 0 && Math.abs(value) < 1 ? 6 : 2;
  const number = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  const sign = value < 0 ? "−" : "";
  return `${sign}${currency === "USD" ? "US$" : "R$"} ${number}`;
}

/** 1.234 -> "+1,23%", -0.5 -> "−0,50%" */
export function formatPercent(value: number): string {
  const number = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(value),
  );
  if (Math.abs(value) < 0.005) return `${number}%`;
  return `${value > 0 ? "+" : "−"}${number}%`;
}
