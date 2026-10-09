import { descriptionKey } from "./categorize";
import type { ParsedRow } from "./types";

export type ExistingTransaction = {
  date: string;
  amount: number; // positive
  type: string;
  description: string;
  externalId: string | null;
};

export type DuplicateReason = "same-id" | "same-day-amount" | null;

/**
 * Why a row is probably already in the account: the bank's own id was
 * imported before, or a movement with the same day, direction and amount
 * exists (typed by hand, for example). Each existing transaction can match
 * only one row, so two identical coffees on the same day stay importable
 * when only one was registered.
 */
export function findDuplicates(rows: ParsedRow[], existing: ExistingTransaction[]): DuplicateReason[] {
  const ids = new Set(existing.map((t) => t.externalId).filter(Boolean));
  const pool = existing.map((t) => ({ ...t, used: false }));

  return rows.map((row) => {
    if (row.externalId && ids.has(row.externalId)) return "same-id";

    const type = row.amount < 0 ? "expense" : "income";
    const amount = Math.abs(row.amount);
    const key = descriptionKey(row.description);
    const candidates = pool.filter(
      (t) => !t.used && t.date === row.date && t.type === type && Math.abs(t.amount - amount) < 0.005,
    );
    // Prefer a candidate with a similar description, if there is one.
    const match = candidates.find((t) => descriptionKey(t.description) === key) ?? candidates[0];
    if (!match) return null;
    match.used = true;
    return "same-day-amount";
  });
}
