import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { goalProgress, GOAL_ICONS, type GoalIcon, type GoalProgress } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";

export type Goal = {
  id: string;
  name: string;
  icon: GoalIcon;
  target: number;
  saved: number;
  startDate: string;
  targetDate: string | null;
  accountId: string | null;
  contributionCount: number;
  progress: GoalProgress;
};

export type GoalContribution = {
  id: string;
  amount: number;
  date: string;
  note: string | null;
};

const GOAL_COLUMNS = "id, name, icon, target_amount, saved, start_date, target_date, account_id, contribution_count";

type GoalRow = {
  id: string | null;
  name: string | null;
  icon: string | null;
  target_amount: number | null;
  saved: number | null;
  start_date: string | null;
  target_date: string | null;
  account_id: string | null;
  contribution_count: number | null;
};

function toGoal(row: GoalRow, today: string): Goal {
  const target = Number(row.target_amount ?? 0);
  const saved = Number(row.saved ?? 0);
  const startDate = row.start_date ?? today;
  const icon = GOAL_ICONS.includes(row.icon as GoalIcon) ? (row.icon as GoalIcon) : "savings";
  return {
    id: row.id!,
    name: row.name ?? "",
    icon,
    target,
    saved,
    startDate,
    targetDate: row.target_date,
    accountId: row.account_id,
    contributionCount: row.contribution_count ?? 0,
    progress: goalProgress({ target, saved, startDate, targetDate: row.target_date, today }),
  };
}

const STATUS_ORDER = { overdue: 0, behind: 1, on_track: 2, no_deadline: 3, done: 4 } as const;

/** Unfinished goals first (missed and late ones on top), then by deadline. */
export async function getGoals(today: string): Promise<Goal[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("goal_progress").select(GOAL_COLUMNS).order("created_at");
  if (error) throw error;

  return data
    .map((row) => toGoal(row, today))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.progress.status] - STATUS_ORDER[b.progress.status] ||
        (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999"),
    );
}

export async function getGoal(id: string, today: string): Promise<Goal | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("goal_progress").select(GOAL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toGoal(data, today) : null;
}

export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goal_contributions")
    .select("id, amount, date, note")
    .eq("goal_id", goalId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, amount: Number(row.amount), date: row.date, note: row.note }));
}
