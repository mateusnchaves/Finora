import { previousDay } from "@/lib/dates";

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

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function formatMoney(value: number): string {
  const formatted = `R$ ${currency.format(Math.abs(value))}`;
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatSignedMoney(value: number, direction: "in" | "out"): string {
  return `${direction === "in" ? "+" : "−"} R$ ${currency.format(Math.abs(value))}`;
}

/** Value for a money input field: 1234.5 -> "1.234,50". */
export function formatMoneyInput(value: number): string {
  return currency.format(value);
}

/**
 * Parses what people type in a money field. Accepts "1.234,56", "1234,56",
 * "R$ 1.234,56", "1234.56" and "1.234". Returns null when it is not a number.
 */
export function parseMoney(input: string): number | null {
  let text = input.replace(/R\$|\s/g, "");
  if (!text) return null;

  if (text.includes(",")) {
    // Brazilian format: dots are thousands, the comma is the decimal mark.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    // "1.234" or "1.234.567": dots as thousands, no cents.
    text = text.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  return Number(text);
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

/** "2026-10" -> "outubro de 2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS_LONG[m - 1]} de ${year}`;
}

/** List group heading: "Hoje", "Ontem" or "sexta, 3 de outubro". */
export function formatDayHeading(isoDate: string, today: string): string {
  if (isoDate === today) return "Hoje";
  if (isoDate === previousDay(today)) return "Ontem";
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${day} de ${MONTHS_LONG[month - 1]}`;
}

/** "outubro" -> "Outubro" */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
