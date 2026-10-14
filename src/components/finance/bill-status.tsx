import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { BILL_STATUS_LABELS, type BillStatus } from "@/lib/credit-card";

/*
 * Status pairs color with a word and an icon. Only an overdue bill is a real alert
 * (`negative`); a paid one is brand, the rest stay neutral.
 */
const STYLES: Record<BillStatus, { icon: IconName; className: string }> = {
  open: { icon: "schedule", className: "border border-border bg-surface text-ink-muted" },
  closed: { icon: "lock", className: "bg-brand-tint text-ink" },
  paid: { icon: "check_circle", className: "bg-brand-tint text-brand" },
  overdue: { icon: "warning", className: "bg-negative-tint text-negative" },
  empty: { icon: "remove", className: "border border-border bg-surface text-ink-muted" },
};

export function BillStatusBadge({ status, className }: { status: BillStatus; className?: string }) {
  const style = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-label font-semibold",
        style.className,
        className,
      )}
    >
      <Icon name={style.icon} size={16} />
      {BILL_STATUS_LABELS[status]}
    </span>
  );
}
