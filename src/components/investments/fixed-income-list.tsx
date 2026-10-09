import Link from "next/link";
import { Result } from "@/components/investments/portfolio";
import { Card } from "@/components/ui/card";
import type { FixedIncomeItem } from "@/lib/data/fixed-income";
import { describeRate, FIXED_INCOME_KINDS } from "@/lib/fixed-income/kinds";
import { formatMoney, formatShortDate } from "@/lib/format";

export function maturityText(item: FixedIncomeItem) {
  if (!item.maturityDate) return "sem vencimento";
  const label = `${formatShortDate(item.maturityDate)} ${item.maturityDate.slice(0, 4)}`;
  return item.valuation.matured ? `venceu em ${label}` : `vence em ${label}`;
}

export function FixedIncomeList({ items }: { items: FixedIncomeItem[] }) {
  return (
    <section aria-labelledby="class-fixed-income">
      <h2 id="class-fixed-income" className="mb-2 px-1 text-label text-ink-muted">
        Renda fixa
      </h2>
      <Card className="px-6 py-2">
        <ul>
          {[...items]
            .sort((a, b) => b.valuation.grossValue - a.valuation.grossValue)
            .map((item) => (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/investments/fixed-income/${item.id}`}
                  className="-mx-3 grid min-h-11 grid-cols-[1fr_auto] items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-brand-tint/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold text-ink">{item.name}</span>
                    <span className="block truncate text-body-sm text-ink-muted">
                      {FIXED_INCOME_KINDS[item.kind].label} · {describeRate(item.index, item.rate)} ·{" "}
                      {maturityText(item)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tabular block text-body font-semibold text-ink">
                      {formatMoney(item.valuation.grossValue)}
                    </span>
                    {item.valuation.missingRates ? (
                      <span className="text-body-sm text-ink-muted">Índice indisponível agora</span>
                    ) : (
                      <Result amount={item.valuation.gain} percent={item.valuation.gainPercent} size="sm" />
                    )}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </section>
  );
}
