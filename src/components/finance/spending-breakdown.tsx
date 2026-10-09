import { Card, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { CategoryTotal } from "@/lib/summary";

/** "Para onde foi o dinheiro": expenses per category as proportional bars. */
export function SpendingBreakdown({ categories }: { categories: CategoryTotal[] }) {
  return (
    <Card>
      <CardTitle>Para onde foi o dinheiro</CardTitle>
      <p className="mt-1 mb-5 text-body-sm text-ink-muted">Despesas do mês por categoria.</p>
      <ul className="flex flex-col gap-4">
        {categories.map(({ category, total, share }) => {
          const percent = Math.round(share * 100);
          return (
            <li key={category}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-body text-ink">{category}</span>
                <span className="tabular text-body-sm text-ink-muted">
                  <span className="font-semibold text-ink">{formatMoney(total)}</span> · {percent}%
                </span>
              </div>
              <div
                role="meter"
                aria-label={`${category}: ${percent}% das despesas`}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-sm bg-brand-tint"
              >
                <div className="h-full rounded-sm bg-brand" style={{ width: `${Math.max(percent, 2)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
