/*
 * Formatting rules from the Finora brand book:
 * - Money: "R$ 1.836,20" (dot for thousands, comma for cents, space after R$).
 * - Signed money: "+ R$ 4.200,00" for income, "− R$ 184,30" (U+2212) for expenses.
 * - Short dates: "6 out".
 */

const currency = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatMoney(value: number): string {
  const formatted = `R$ ${currency.format(Math.abs(value))}`;
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatSignedMoney(value: number, direction: "in" | "out"): string {
  return `${direction === "in" ? "+" : "−"} R$ ${currency.format(Math.abs(value))}`;
}

/** "2026-10-06" -> "6 out" */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

/** month is 1-12 */
export function monthName(month: number): string {
  return MONTHS_LONG[month - 1];
}
