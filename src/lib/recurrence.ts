import { daysInMonth, monthOf, shiftMonth } from "@/lib/dates";

/**
 * Next date a monthly rule will create a transaction: on or after today, after
 * what was already generated, and within the start/end dates. Day 31 clamps to
 * short months. Null when the rule has ended. Mirrors private.occurrence_date.
 */
export function nextOccurrence(
  rule: { dayOfMonth: number; startDate: string; endDate: string | null; generatedUntil?: string | null },
  today: string,
): string | null {
  const afterGenerated = rule.generatedUntil ? nextDay(rule.generatedUntil) : rule.startDate;
  const from = [rule.startDate, afterGenerated, today].sort().at(-1)!;
  let month = monthOf(from);
  for (let i = 0; i < 3; i++) {
    const day = Math.min(rule.dayOfMonth, daysInMonth(month));
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if (date >= from) return rule.endDate && date > rule.endDate ? null : date;
    month = shiftMonth(month, 1);
  }
  return null;
}

function nextDay(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
