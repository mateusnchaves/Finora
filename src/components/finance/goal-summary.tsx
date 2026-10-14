import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Goal } from "@/lib/data/goals";
import { formatMoney, formatMonth, formatShortDate } from "@/lib/format";
import { GOAL_STATUS_LABELS, type GoalStatus } from "@/lib/goals";

/*
 * Status pairs color with a word and an icon. A missed deadline is the only real alert
 * (`negative`); being behind is information, not an error, so it stays neutral.
 */
const STATUS_STYLES: Record<GoalStatus, { icon: IconName; className: string }> = {
  done: { icon: "check_circle", className: "bg-brand-tint text-brand" },
  on_track: { icon: "trending_up", className: "bg-brand-tint text-ink" },
  behind: { icon: "schedule", className: "border border-border bg-surface text-ink" },
  overdue: { icon: "warning", className: "bg-negative-tint text-negative" },
  no_deadline: { icon: "flag", className: "border border-border bg-surface text-ink-muted" },
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-label font-semibold",
        style.className,
      )}
    >
      <Icon name={style.icon} size={16} />
      {GOAL_STATUS_LABELS[status]}
    </span>
  );
}

/** One sentence on what to do next. */
export function goalCaption(goal: Goal): string {
  const { status, remaining, monthlyNeeded } = goal.progress;
  switch (status) {
    case "done":
      return `Meta atingida com ${formatMoney(goal.saved)} guardados.`;
    case "overdue":
      return `O prazo era ${formatShortDate(goal.targetDate!)}; faltam ${formatMoney(remaining)}.`;
    case "no_deadline":
      return `Faltam ${formatMoney(remaining)}.`;
    default:
      return `Guarde ${formatMoney(monthlyNeeded!)} por mês até ${formatMonth(goal.targetDate!.slice(0, 7))}.`;
  }
}

export function GoalMeter({ goal }: { goal: Goal }) {
  const percent = Math.round(goal.progress.ratio * 100);
  const overdue = goal.progress.status === "overdue";
  return (
    <div
      role="meter"
      aria-label={`${goal.name}: ${percent}% guardado`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-sm", overdue ? "bg-negative-tint" : "bg-brand-tint")}
    >
      <div
        className={cn("h-full rounded-sm", overdue ? "bg-negative" : "bg-brand")}
        style={{ width: `${Math.max(goal.progress.ratio * 100, goal.saved > 0 ? 1.5 : 0)}%` }}
      />
    </div>
  );
}

/** Goal row for lists and the dashboard: icon, name, status, meter and next step. */
export function GoalSummary({ goal }: { goal: Goal }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/goals/${goal.id}`}
        className="-mx-3 flex min-h-11 items-start gap-3 rounded-md px-3 py-4 transition-colors hover:bg-brand-tint/60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
          <Icon name={goal.icon} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="truncate text-body font-medium text-ink">{goal.name}</span>
            <GoalStatusBadge status={goal.progress.status} />
          </span>
          <GoalMeter goal={goal} />
          <span className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-body-sm text-ink-muted">
            <span>{goalCaption(goal)}</span>
            <span className="tabular">
              <span className="font-semibold text-ink">{formatMoney(goal.saved)}</span> de {formatMoney(goal.target)}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
