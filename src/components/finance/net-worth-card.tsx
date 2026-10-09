"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { NetWorth } from "@/lib/data/net-worth";
import { capitalize, formatMoney, formatMonth } from "@/lib/format";
import { niceMax } from "./monthly-chart";

const SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/*
 * Patrimônio total: one series (brand) of month-end net worth, columns on a
 * zero baseline, a readout on hover/tap and a table view. The split between
 * accounts and investments is shown as two labeled figures, not two colors.
 */
export function NetWorthCard({ netWorth }: { netWorth: NetWorth }) {
  const [active, setActive] = useState<string | null>(null);
  const data = netWorth.history;
  const max = niceMax(Math.max(...data.map((d) => d.total), 0));
  const focused = data.find((d) => d.month === active) ?? null;
  const accountsShare = netWorth.total > 0 ? Math.max(0, netWorth.accounts / netWorth.total) : 0;

  return (
    <Card>
      <CardTitle>Patrimônio total</CardTitle>
      <p className="mt-1 text-body-sm text-ink-muted">Saldo das contas mais investimentos.</p>
      <p className="tabular mt-3 text-figure-md text-ink">{formatMoney(netWorth.total)}</p>

      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-label text-ink-muted">Em contas</dt>
          <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(netWorth.accounts)}</dd>
        </div>
        <div>
          <dt className="text-label text-ink-muted">Investido</dt>
          <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(netWorth.investments)}</dd>
        </div>
      </dl>
      {/* Split bar: accounts (ink) | investments (brand), with a 2px surface gap and words above. */}
      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-sm" aria-hidden="true">
        <span className="rounded-l-sm bg-ink" style={{ width: `${accountsShare * 100}%` }} />
        <span className="flex-1 rounded-r-sm bg-brand" />
      </div>

      <p className="tabular mt-6 min-h-5 text-body-sm text-ink-muted" aria-live="polite">
        {focused ? (
          <>
            <span className="font-semibold text-ink">{capitalize(formatMonth(focused.month))}</span>
            {" · "}
            <span className="font-semibold text-ink">{formatMoney(focused.total)}</span>
            {" · contas "}
            {formatMoney(focused.accounts)}
            {focused.atMarket ? " · investimentos " : " · investido "}
            {formatMoney(focused.investments)}
          </>
        ) : (
          "Evolução nos últimos meses. Passe o mouse ou toque em um mês."
        )}
      </p>

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-3" aria-hidden="true">
        <div className="relative h-36 w-14">
          {[0, max / 2, max].map((tick) => (
            <span
              key={tick}
              className="tabular absolute right-0 translate-y-1/2 text-[11px] leading-none text-ink-muted"
              style={{ bottom: `${(tick / max) * 100}%` }}
            >
              {tick >= 1000 ? `R$ ${(tick / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${tick}`}
            </span>
          ))}
        </div>
        <div className="relative h-36">
          {[0, max / 2, max].map((tick) => (
            <span
              key={tick}
              className={cn("absolute inset-x-0 h-px", tick === 0 ? "bg-border-strong" : "bg-border")}
              style={{ bottom: `${(tick / max) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
            {data.map((d) => (
              <div
                key={d.month}
                onMouseEnter={() => setActive(d.month)}
                onMouseLeave={() => setActive(null)}
                onTouchStart={() => setActive(d.month)}
                className={cn(
                  "flex h-full items-end justify-center rounded-sm transition-colors",
                  active === d.month && "bg-brand-tint/50",
                )}
              >
                <span
                  className="w-full max-w-6 rounded-t-[4px] bg-brand"
                  style={{ height: `${Math.max(0, d.total / max) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="mt-2 grid" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
          {data.map((d, i) => (
            <span
              key={d.month}
              className={cn(
                "text-center text-body-sm",
                i === data.length - 1 ? "font-semibold text-ink" : "text-ink-muted",
              )}
            >
              {i === data.length - 1 ? "hoje" : SHORT[Number(d.month.slice(5, 7)) - 1]}
            </span>
          ))}
        </div>
      </div>

      <details className="group mt-5">
        <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint">
          <Icon name="table_view" size={18} />
          Ver como tabela
        </summary>
        <table className="tabular mt-2 w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-muted">
              <th scope="col" className="py-2 font-semibold">Mês</th>
              <th scope="col" className="py-2 text-right font-semibold">Contas</th>
              <th scope="col" className="py-2 text-right font-semibold">Investimentos</th>
              <th scope="col" className="py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-b border-border last:border-b-0">
                <th scope="row" className="py-2 text-left font-normal text-ink">
                  {capitalize(formatMonth(d.month))}
                </th>
                <td className="py-2 text-right text-ink">{formatMoney(d.accounts)}</td>
                <td className="py-2 text-right text-ink">{formatMoney(d.investments)}</td>
                <td className="py-2 text-right text-ink">{formatMoney(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="mt-4 text-body-sm text-ink-muted">
        Meses anteriores somam o valor aplicado nos investimentos; hoje, o valor de mercado.{" "}
        <Link href="/investments" className="font-semibold text-brand underline-offset-4 hover:underline">
          Ver investimentos
        </Link>
      </p>
    </Card>
  );
}
