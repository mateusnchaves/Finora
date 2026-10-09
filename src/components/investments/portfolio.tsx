import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Holding } from "@/lib/data/investments";
import { ASSET_CLASSES, ASSET_CLASS_INFO } from "@/lib/investments/classes";
import { formatPercent, formatPrice, formatQuantity } from "@/lib/investments/numbers";
import type { Quote } from "@/lib/investments/quotes";
import { formatMoney } from "@/lib/format";

/*
 * Gains use `brand` with "+" and an up arrow; losses use `ink` with "−" and a
 * down arrow. A loss is information, not an alert, so it is never red.
 */
export function Result({
  amount,
  percent,
  currency = "BRL",
  size = "body",
}: {
  amount: number | null;
  percent?: number | null;
  currency?: "BRL" | "USD";
  size?: "body" | "sm";
}) {
  if (amount === null) return <span className="text-ink-muted">Sem cotação</span>;
  const up = amount >= 0;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 font-semibold",
        size === "sm" ? "text-body-sm" : "text-body",
        up ? "text-brand" : "text-ink",
      )}
    >
      <Icon name={up ? "arrow_upward" : "arrow_downward"} size={size === "sm" ? 14 : 16} />
      {up ? "+" : ""}
      {formatPrice(amount, currency)}
      {percent !== null && percent !== undefined && (
        <span className="ml-1 font-normal text-ink-muted">({formatPercent(percent)})</span>
      )}
    </span>
  );
}

export type PortfolioTotals = { value: number; invested: number; result: number; resultPercent: number; realized: number };

export function PortfolioSummary({ totals }: { totals: PortfolioTotals }) {
  return (
    <Card>
      <p className="text-label text-ink-muted">Patrimônio investido</p>
      <p className="mt-2 font-display text-figure-xl text-ink">{formatMoney(totals.value)}</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-label text-ink-muted">Valor aplicado</dt>
          <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(totals.invested)}</dd>
        </div>
        <div>
          <dt className="text-label text-ink-muted">Resultado</dt>
          <dd className="mt-1">
            <Result amount={totals.result} percent={totals.resultPercent} />
          </dd>
        </div>
        <div>
          <dt className="text-label text-ink-muted">Lucro realizado em vendas</dt>
          <dd className="mt-1">
            <Result amount={totals.realized} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export type AllocationItem = { key: string; label: string; icon: IconName; value: number };

/** Allocation by class: single-hue bars on a shared baseline, largest first. */
export function AllocationCard({ items }: { items: AllocationItem[] }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, i) => sum + i.value, 0);
  const largest = sorted[0]?.value ?? 0;
  return (
    <Card>
      <CardTitle>Onde está investido</CardTitle>
      <p className="mt-1 mb-5 text-body-sm text-ink-muted">Distribuição do patrimônio por tipo de ativo.</p>
      <ul className="flex flex-col gap-4">
        {sorted.map(({ key, label, icon, value }) => (
          <li key={key} className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-pill bg-brand-tint text-brand"
              aria-hidden="true"
            >
              <Icon name={icon} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-body text-ink">{label}</span>
                <span className="tabular text-body-sm text-ink-muted">
                  <span className="font-semibold text-ink">{formatMoney(value)}</span> ·{" "}
                  {total ? Math.round((value / total) * 100) : 0}%
                </span>
              </span>
              <span className="block h-2 overflow-hidden rounded-sm bg-brand-tint" aria-hidden="true">
                <span
                  className="block h-full rounded-sm bg-brand"
                  style={{ width: `${Math.max(largest ? (value / largest) * 100 : 0, 1.5)}%` }}
                />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HoldingsByClass({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="flex flex-col gap-6">
      {ASSET_CLASSES.map((assetClass) => {
        const items = holdings
          .filter((h) => h.asset.class === assetClass)
          .sort((a, b) => (b.valueBRL ?? 0) - (a.valueBRL ?? 0));
        if (items.length === 0) return null;
        return (
          <section key={assetClass} aria-labelledby={`class-${assetClass}`}>
            <h2 id={`class-${assetClass}`} className="mb-2 px-1 text-label text-ink-muted">
              {ASSET_CLASS_INFO[assetClass].label}
            </h2>
            <Card className="px-6 py-2">
              <ul>
                {items.map((h) => (
                  <HoldingRow key={h.asset.id} holding={h} />
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}

function HoldingRow({ holding }: { holding: Holding }) {
  const { asset, position, quote } = holding;
  const unit = asset.class === "crypto" ? asset.ticker : asset.class === "fii" ? "cotas" : "ações";
  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/investments/${asset.id}`}
        className="-mx-3 grid min-h-11 grid-cols-[1fr_auto] items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-brand-tint/60"
      >
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="text-body font-semibold text-ink">{asset.ticker}</span>
            <span className="truncate text-body-sm text-ink-muted">{asset.name}</span>
          </span>
          <span className="tabular block text-body-sm text-ink-muted">
            {formatQuantity(position.quantity)} {unit} · PM {formatPrice(position.averagePrice, asset.currency)}
            {quote && ` · agora ${formatPrice(quote.price, asset.currency)}`}
          </span>
        </span>
        <span className="text-right">
          <span className="tabular block text-body font-semibold text-ink">
            {holding.valueBRL === null ? "—" : formatMoney(holding.valueBRL)}
          </span>
          <Result amount={holding.resultBRL} percent={holding.resultPercent} size="sm" />
        </span>
      </Link>
    </li>
  );
}

function minutesAgo(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `há ${hours} h`;
}

export function QuotesFootnote({
  updatedAt,
  usdBrl,
  hasStale,
  missing,
  now,
}: {
  updatedAt: string | null;
  usdBrl: Quote | null;
  hasStale: boolean;
  missing: number;
  now: number;
}) {
  return (
    <div className="flex flex-col gap-2 text-body-sm text-ink-muted">
      {(hasStale || missing > 0) && (
        <p className="flex items-center gap-1.5 text-ink">
          <Icon name="sync_problem" size={18} />
          {missing > 0
            ? `${missing} ${missing === 1 ? "ativo está" : "ativos estão"} sem cotação; o valor considera o preço médio.`
            : "Algumas cotações não atualizaram e mostram o último valor conhecido."}
        </p>
      )}
      <p>
        Cotações de brapi.dev (B3 e EUA), CoinGecko (cripto) e AwesomeAPI (dólar)
        {updatedAt ? `, atualizadas ${minutesAgo(updatedAt, now)}` : ""}. Podem ter atraso de até 15 minutos.
        {usdBrl && ` Dólar: ${formatPrice(usdBrl.price, "BRL")}.`}
      </p>
    </div>
  );
}
