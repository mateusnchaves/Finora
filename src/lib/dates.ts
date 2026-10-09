/*
 * Calendar helpers. Dates travel as ISO strings ("2026-10-06") and months as
 * "2026-10", so there is no time zone math outside todayISO().
 */

export const APP_TIME_ZONE = "America/Sao_Paulo";

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in São Paulo, e.g. "2026-10-08". */
export function todayISO(now: Date = new Date()): string {
  // en-CA formats as yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

export function isISODate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "2026-10" from "2026-10-08". */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Returns the month param if valid, otherwise the current month. */
export function parseMonthParam(value: string | string[] | undefined, today: string = todayISO()): string {
  return typeof value === "string" && MONTH_PATTERN.test(value) ? value : monthOf(today);
}

/** "2026-10" + 1 -> "2026-11"; "2026-01" - 1 -> "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** First day of the month and first day of the next month (exclusive end). */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

/** "2026-10-06" -> "2026-10-05" */
export function previousDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - 1));
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

/** Same day of the month in another month, capped at its last day (31 Oct -> 30 Sep). */
export function sameDayIn(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}
