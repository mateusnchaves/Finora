import { CategoryAvatar } from "@/components/finance/transaction-list";
import { Icon } from "@/components/ui/icon";
import { budgetStatus } from "@/lib/budget-status";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

/*
 * Meter: the fill carries the state on a same-ramp track (brand on
 * brand-tint). Over the limit is a real alert, so the fill turns `negative`
 * on `negative-tint`. Every state is also spelled out in words, with an icon
 * when it needs attention.
 */
export function BudgetMeter({
  name,
  amount,
  spent,
  isCurrentMonth,
}: {
  name: string;
  amount: number;
  spent: number;
  isCurrentMonth: boolean;
}) {
  const status = budgetStatus(spent, amount);
  const ratio = amount > 0 ? spent / amount : 0;
  const percent = Math.round(ratio * 100);
  const left = amount - spent;

  const caption =
    status === "over"
      ? `Limite estourado em ${formatMoney(-left)}`
      : status === "near"
        ? `Perto do limite · ${isCurrentMonth ? "restam" : "sobraram"} ${formatMoney(left)}`
        : `${isCurrentMonth ? "Restam" : "Sobraram"} ${formatMoney(left)}`;

  return (
    <div className="flex items-center gap-3">
      <CategoryAvatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-body text-ink">{name}</span>
          <span className="tabular shrink-0 text-body-sm text-ink-muted">
            <span className="font-semibold text-ink">{formatMoney(spent)}</span> de {formatMoney(amount)}
          </span>
        </div>
        <div
          role="meter"
          aria-label={`${name}: ${percent}% do orçamento usado`}
          aria-valuenow={Math.min(percent, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn("h-2 overflow-hidden rounded-sm", status === "over" ? "bg-negative-tint" : "bg-brand-tint")}
        >
          <div
            className={cn("h-full rounded-sm", status === "over" ? "bg-negative" : "bg-brand")}
            style={{ width: `${Math.max(Math.min(ratio, 1) * 100, spent > 0 ? 1.5 : 0)}%` }}
          />
        </div>
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-body-sm",
            status === "over" ? "text-negative" : status === "near" ? "text-ink" : "text-ink-muted",
          )}
        >
          {status !== "ok" && <Icon name="error" size={16} />}
          {caption}
          <span className="tabular ml-auto text-ink-muted">{percent}%</span>
        </p>
      </div>
    </div>
  );
}
