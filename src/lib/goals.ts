/*
 * Savings goal math. The pace is linear: by the halfway point between the start and the
 * deadline, half the target should be set aside. A goal more than 10% behind that line is
 * "atrasada"; the monthly amount spreads what is left over the months until the deadline.
 */
import { daysUntil } from "./dates";

export type GoalStatus = "done" | "on_track" | "behind" | "overdue" | "no_deadline";

export type GoalInput = {
  target: number;
  saved: number;
  startDate: string;
  targetDate: string | null;
  today: string;
};

export type GoalProgress = {
  status: GoalStatus;
  /** 0..1, capped. */
  ratio: number;
  remaining: number;
  /** Calendar months left until the deadline, counting the current one; null without a deadline. */
  monthsLeft: number | null;
  /** What to set aside per month to arrive on time; null when done or without a deadline. */
  monthlyNeeded: number | null;
  /** Where the linear pace says the goal should be today; null without a deadline. */
  expectedNow: number | null;
};

export const GOAL_ICONS = [
  "savings",
  "flight",
  "beach_access",
  "home",
  "directions_car",
  "school",
  "laptop_mac",
  "celebration",
  "favorite",
  "pets",
  "flag",
] as const;

export type GoalIcon = (typeof GOAL_ICONS)[number];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  done: "Concluída",
  on_track: "No ritmo",
  behind: "Atrasada",
  overdue: "Prazo vencido",
  no_deadline: "Sem prazo",
};

const BEHIND_TOLERANCE = 0.9;

/** Months from today's month to the deadline's month, inclusive of the current one. */
export function monthsUntil(targetDate: string, today: string): number {
  const [ty, tm] = targetDate.split("-").map(Number);
  const [y, m] = today.split("-").map(Number);
  return Math.max((ty - y) * 12 + (tm - m) + 1, 1);
}

export function goalProgress({ target, saved, startDate, targetDate, today }: GoalInput): GoalProgress {
  const remaining = round(Math.max(target - saved, 0));
  const ratio = target > 0 ? Math.min(Math.max(saved / target, 0), 1) : 0;

  if (remaining === 0) {
    return { status: "done", ratio: 1, remaining: 0, monthsLeft: null, monthlyNeeded: null, expectedNow: null };
  }
  if (!targetDate) {
    return { status: "no_deadline", ratio, remaining, monthsLeft: null, monthlyNeeded: null, expectedNow: null };
  }
  if (targetDate < today) {
    return { status: "overdue", ratio, remaining, monthsLeft: 0, monthlyNeeded: remaining, expectedNow: target };
  }

  const total = Math.max(daysUntil(targetDate, startDate), 1);
  const elapsed = Math.min(Math.max(daysUntil(today, startDate), 0), total);
  const expectedNow = round((target * elapsed) / total);
  const monthsLeft = monthsUntil(targetDate, today);

  return {
    status: saved >= expectedNow * BEHIND_TOLERANCE ? "on_track" : "behind",
    ratio,
    remaining,
    monthsLeft,
    monthlyNeeded: round(remaining / monthsLeft),
    expectedNow,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
