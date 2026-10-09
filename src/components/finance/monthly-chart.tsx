"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { MonthTotals } from "@/lib/data/dashboard";
import { capitalize, formatMoney } from "@/lib/format";
import { transactionsHref } from "@/lib/transaction-filters";

/*
 * Receitas x Despesas, six months as grouped columns on one baseline.
 * Two series: income in `brand`, expenses in `ink` (the brand book's money
 * colors). Validated: CVD ΔE 17.7 light / 24.2 dark, contrast >= 3:1 on
 * surface-raised in both themes. `ink` is a near-neutral, so identity is
 * also carried by the legend, the tooltip and the table view.
 *
 * Marks: columns <= 24px, 4px rounded tops, square at the baseline, 2px gap
 * between the pair; hairline grid; the whole month band is the hover target.
 */

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const LONG_MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function monthParts(month: string) {
  const index = Number(month.slice(5, 7)) - 1;
  return { short: SHORT_MONTHS[index], long: LONG_MONTHS[index] };
}

/** Clean, even axis maximum at or above the data max, so the half-way tick is round too. */
export function niceMax(value: number): number {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 3, 4, 5, 6, 8, 10].find((s) => s * power >= value)!;
  return step * power;
}

/** "R$ 6 mil", "R$ 12,5 mil", "R$ 800" for axis ticks. */
function compactMoney(value: number) {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `R$ ${thousands.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  }
  return `R$ ${Math.round(value)}`;
}

export function MonthlyChart({ data, currentMonth }: { data: MonthTotals[]; currentMonth: string }) {
  const [active, setActive] = useState<string | null>(null);
  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expenses])));
  const ticks = [0, max / 2, max];
  const focused = data.find((d) => d.month === active);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Receitas x Despesas</CardTitle>
          <p className="mt-1 text-body-sm text-ink-muted">Últimos seis meses.</p>
        </div>
        <ul className="flex gap-4 text-body-sm text-ink-muted" aria-label="Legenda">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-brand" aria-hidden="true" />
            Receitas
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-ink" aria-hidden="true" />
            Despesas
          </li>
        </ul>
      </div>

      {/* Tooltip line: always reserves its height so the chart does not jump. */}
      <p className="tabular mt-4 min-h-5 text-body-sm text-ink-muted" aria-live="polite">
        {focused ? (
          <>
            <span className="font-semibold text-ink">{capitalize(monthParts(focused.month).long)}</span>
            {" · "}Receitas <span className="font-semibold text-ink">{formatMoney(focused.income)}</span>
            {" · "}Despesas <span className="font-semibold text-ink">{formatMoney(focused.expenses)}</span>
            {" · "}Sobra <span className="font-semibold text-ink">{formatMoney(focused.income - focused.expenses)}</span>
          </>
        ) : (
          "Passe o mouse ou toque em um mês para ver os valores."
        )}
      </p>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3" aria-hidden="true">
        {/* Y axis */}
        <div className="relative h-48 w-14">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="tabular absolute right-0 translate-y-1/2 text-[11px] leading-none text-ink-muted"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {compactMoney(tick)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative h-48">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-border-strong" : "bg-border")}
              style={{ bottom: `${(tick / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
            {data.map((d) => (
              <Link
                key={d.month}
                href={transactionsHref({ month: d.month })}
                tabIndex={-1}
                onMouseEnter={() => setActive(d.month)}
                onMouseLeave={() => setActive(null)}
                onTouchStart={() => setActive(d.month)}
                className={cn(
                  "flex h-full items-end justify-center gap-0.5 rounded-sm transition-colors",
                  active === d.month && "bg-brand-tint/50",
                )}
              >
                <span
                  className="w-full max-w-6 rounded-t-[4px] bg-brand"
                  style={{ height: `${(d.income / max) * 100}%` }}
                />
                <span
                  className="w-full max-w-6 rounded-t-[4px] bg-ink"
                  style={{ height: `${(d.expenses / max) * 100}%` }}
                />
              </Link>
            ))}
          </div>
        </div>

        {/* X axis */}
        <span />
        <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
          {data.map((d) => (
            <span
              key={d.month}
              className={cn(
                "text-center text-body-sm",
                d.month === currentMonth ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              {monthParts(d.month).short}
            </span>
          ))}
        </div>
      </div>

      <details className="group mt-5">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 -mx-2 text-body-sm font-semibold text-brand hover:bg-brand-tint">
          <Icon name="table_view" size={18} />
          Ver como tabela
        </summary>
        <table className="tabular mt-2 w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-muted">
              <th scope="col" className="py-2 font-semibold">Mês</th>
              <th scope="col" className="py-2 text-right font-semibold">Receitas</th>
              <th scope="col" className="py-2 text-right font-semibold">Despesas</th>
              <th scope="col" className="py-2 text-right font-semibold">Sobra</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b border-border last:border-b-0">
                <th scope="row" className="py-2 text-left font-normal text-ink">
                  {capitalize(monthParts(d.month).long)}
                </th>
                <td className="py-2 text-right text-ink">{formatMoney(d.income)}</td>
                <td className="py-2 text-right text-ink">{formatMoney(d.expenses)}</td>
                <td className="py-2 text-right text-ink">{formatMoney(d.income - d.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
