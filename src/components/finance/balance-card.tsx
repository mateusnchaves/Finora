import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/format";

/*
 * First block of the home screen. The balance is a fact, never colored red
 * or green. Income uses `brand`, expenses use `ink`; each flow carries an
 * icon and a word, never color alone. The hero figure keeps proportional
 * digits (tabular is only for aligned columns).
 */
export function BalanceCard({
  balance,
  income,
  expenses,
  monthLabel,
  comparison,
}: {
  balance: number;
  income: number;
  expenses: number;
  monthLabel: string;
  comparison?: string;
}) {
  return (
    <Card>
      <p className="text-label text-ink-muted">Saldo total hoje</p>
      <p className="mt-2 mb-5 font-display text-figure-xl text-ink">{formatMoney(balance)}</p>

      <p className="mb-2 text-body-sm text-ink-muted first-letter:uppercase">{monthLabel}</p>
      <dl className="flex flex-wrap gap-x-10 gap-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
            <Icon name="arrow_upward" size={20} />
          </span>
          <div>
            <dt className="text-label text-ink-muted">Receitas</dt>
            <dd className="tabular text-figure-md text-brand">{formatMoney(income)}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-pill bg-brand-tint text-ink" aria-hidden="true">
            <Icon name="arrow_downward" size={20} />
          </span>
          <div>
            <dt className="text-label text-ink-muted">Despesas</dt>
            <dd className="tabular text-figure-md text-ink">{formatMoney(expenses)}</dd>
          </div>
        </div>
      </dl>

      {comparison && (
        <p className="mt-5 border-t border-border pt-3 text-body-sm text-ink-muted">{comparison}</p>
      )}
    </Card>
  );
}
