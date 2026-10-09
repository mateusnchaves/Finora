import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/format";

/*
 * First block of the home screen. The balance is a fact, never colored red
 * or green. Income uses `brand`, expenses use `ink`; each flow carries an
 * icon and a word, never color alone.
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
      <div className="flex items-center justify-between text-label text-ink-muted">
        <span>Saldo total</span>
        <span className="capitalize">{monthLabel}</span>
      </div>
      <p className="tabular mt-2 mb-4 font-display text-figure-xl text-ink">{formatMoney(balance)}</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-label">
        <span className="tabular inline-flex items-center gap-1 text-brand">
          <Icon name="arrow_drop_up" size={20} />
          Receitas {formatMoney(income)}
        </span>
        <span className="tabular inline-flex items-center gap-1 text-ink">
          <Icon name="arrow_drop_down" size={20} />
          Despesas {formatMoney(expenses)}
        </span>
      </div>
      {comparison && (
        <p className="mt-4 border-t border-border pt-3 text-body-sm text-ink-muted">{comparison}</p>
      )}
    </Card>
  );
}
