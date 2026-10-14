/*
 * Credit card bill math. A bill is named after the month it is due ("fatura de novembro").
 * It closes on the closing day (clamped to short months); purchases made on the closing day
 * already go to the next bill, which is how Brazilian banks show the "melhor dia de compra".
 */
import { monthOf, sameDayIn, shiftMonth } from "./dates";

/** Most Brazilian cards stop at 12x or 24x. */
export const MAX_INSTALLMENTS = 24;

export type CardSettings = { closingDay: number; dueDay: number };

export type BillPeriod = {
  /** Due month, "2026-11": the bill's name. */
  month: string;
  /** First purchase date included (the previous closing date). */
  start: string;
  /** Closing date: purchases before it are in this bill. */
  closing: string;
  due: string;
};

export type BillStatus = "open" | "closed" | "paid" | "overdue" | "empty";

/** When the due day is after the closing day, the bill is due in the same month it closes. */
function closingMonthFor(dueMonth: string, card: CardSettings) {
  return card.dueDay > card.closingDay ? dueMonth : shiftMonth(dueMonth, -1);
}

export function billByClosingMonth(closingMonth: string, card: CardSettings): BillPeriod {
  const due =
    card.dueDay > card.closingDay
      ? sameDayIn(closingMonth, card.dueDay)
      : sameDayIn(shiftMonth(closingMonth, 1), card.dueDay);
  return {
    month: monthOf(due),
    start: sameDayIn(shiftMonth(closingMonth, -1), card.closingDay),
    closing: sameDayIn(closingMonth, card.closingDay),
    due,
  };
}

/** The bill due in a given month. */
export function billByDueMonth(dueMonth: string, card: CardSettings): BillPeriod {
  return billByClosingMonth(closingMonthFor(dueMonth, card), card);
}

/** The bill a purchase made on this date belongs to. */
export function billForDate(date: string, card: CardSettings): BillPeriod {
  const month = monthOf(date);
  const closing = sameDayIn(month, card.closingDay);
  return billByClosingMonth(date < closing ? month : shiftMonth(month, 1), card);
}

/**
 * Payments made after a bill closes and before the next one closes count toward it
 * (people pay the bill that is already closed).
 */
export function paymentWindow(bill: BillPeriod, card: CardSettings): { start: string; end: string } {
  return { start: bill.closing, end: billByDueMonth(shiftMonth(bill.month, 1), card).closing };
}

export function billStatus(bill: BillPeriod, today: string, total: number, paid: number): BillStatus {
  if (today < bill.closing) return total > 0 ? "open" : "empty";
  if (total <= 0) return "empty";
  if (paid >= total - 0.005) return "paid";
  return today > bill.due ? "overdue" : "closed";
}

/** Splits a total into installments in cents; the first one absorbs the rounding. */
export function splitInstallments(total: number, count: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) => (i === 0 ? cents - base * (count - 1) : base) / 100);
}

/** Installment n (1-based) is charged n − 1 months after the purchase, on the same day if it exists. */
export function installmentDate(purchaseDate: string, n: number): string {
  const day = Number(purchaseDate.slice(8, 10));
  return sameDayIn(shiftMonth(monthOf(purchaseDate), n - 1), day);
}

const INSTALLMENT_PATTERN = /\bparcela\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})\b/i;

/** Reads "Parcela 3/12" (or "parcela 3 de 12") from a bank statement description. */
export function parseInstallment(description: string): { number: number; count: number } | null {
  const match = INSTALLMENT_PATTERN.exec(description);
  if (!match) return null;
  const number = Number(match[1]);
  const count = Number(match[2]);
  if (count < 2 || count > 48 || number < 1 || number > count) return null;
  return { number, count };
}

/** Whole days from today until a date (negative when it has passed). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  paid: "Paga",
  overdue: "Vencida",
  empty: "Sem lançamentos",
};
