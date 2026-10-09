import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { QuotesFootnote, Result } from "@/components/investments/portfolio";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { getHolding } from "@/lib/data/investments";
import { ASSET_CLASS_INFO } from "@/lib/investments/classes";
import { formatPercent, formatPrice, formatQuantity } from "@/lib/investments/numbers";
import { formatMoney, formatShortDate } from "@/lib/format";
import { deleteAsset, deleteTrade } from "../actions";

export const metadata: Metadata = { title: "Ativo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AssetPage({ params }: PageProps<"/investments/[id]">) {
  return (
    <>
      <Link
        href="/investments"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
      >
        <Icon name="arrow_back" size={18} />
        Investimentos
      </Link>
      <Suspense fallback={<Card className="h-96" aria-hidden="true" />}>
        <AssetContent params={params} />
      </Suspense>
    </>
  );
}

async function AssetContent({ params }: { params: PageProps<"/investments/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await connection();
  const result = await getHolding(id);
  if (!result) notFound();

  const { holding, usdBrl } = result;
  const { asset, position, quote, trades } = holding;
  const info = ASSET_CLASS_INFO[asset.class];
  // In the asset's own currency, so a US stock reads in dollars here.
  const positionResult = quote ? (quote.price - position.averagePrice) * position.quantity : null;
  const positionPercent =
    quote && position.averagePrice > 0 ? ((quote.price - position.averagePrice) / position.averagePrice) * 100 : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label text-ink-muted">{info.singular}</p>
          <h1 className="font-display text-heading-lg text-ink">{asset.ticker}</h1>
          <p className="text-body text-ink-muted">{asset.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/investments/new?asset=${asset.id}`} className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Comprar
          </Link>
          {position.quantity > 0 && (
            <Link href={`/investments/new?asset=${asset.id}&type=sell`} className={buttonClasses("secondary")}>
              Vender
            </Link>
          )}
        </div>
      </header>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-label text-ink-muted">Cotação</p>
            <p className="tabular mt-1 text-figure-md text-ink">
              {quote ? formatPrice(quote.price, asset.currency) : "Sem cotação"}
            </p>
          </div>
          {quote && quote.changePercent !== null && (
            <p className={cn("tabular text-body font-semibold", quote.changePercent >= 0 ? "text-brand" : "text-ink")}>
              {formatPercent(quote.changePercent)} <span className="font-normal text-ink-muted">no dia</span>
            </p>
          )}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-label text-ink-muted">Quantidade</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">{formatQuantity(position.quantity)}</dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Preço médio</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">
              {formatPrice(position.averagePrice, asset.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Valor atual</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">
              {holding.valueBRL === null ? "—" : formatMoney(holding.valueBRL)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Resultado da posição</dt>
            <dd className="mt-1">
              <Result amount={positionResult} percent={positionPercent} currency={asset.currency} />
            </dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Lucro realizado</dt>
            <dd className="mt-1">
              <Result amount={position.realized} currency={asset.currency} />
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle className="mb-2">Operações</CardTitle>
        <ul>
          {trades.map((trade) => {
            const total = trade.quantity * trade.price + (trade.type === "buy" ? trade.fees : -trade.fees);
            return (
              <li
                key={trade.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-pill bg-brand-tint",
                    trade.type === "buy" ? "text-brand" : "text-ink",
                  )}
                  aria-hidden="true"
                >
                  <Icon name={trade.type === "buy" ? "add" : "sell"} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tabular text-body text-ink">
                    <span className="font-semibold">{trade.type === "buy" ? "Compra" : "Venda"}</span> de{" "}
                    {formatQuantity(trade.quantity)} a {formatPrice(trade.price, asset.currency)}
                  </p>
                  <p className="tabular text-body-sm text-ink-muted">
                    {formatShortDate(trade.date)} {trade.date.slice(0, 4)}
                    {trade.fees > 0 && ` · taxas ${formatPrice(trade.fees, asset.currency)}`} · total{" "}
                    {formatPrice(total, asset.currency)}
                  </p>
                </div>
                <Link href={`/investments/${asset.id}/trades/${trade.id}/edit`} className={buttonClasses("quiet")}>
                  <Icon name="edit" size={18} />
                  <span className="sr-only">Editar operação de {formatShortDate(trade.date)}</span>
                </Link>
                <ConfirmButton
                  subtle
                  label="Excluir"
                  confirmLabel="Excluir operação"
                  action={deleteTrade.bind(null, trade.id, asset.id)}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <QuotesFootnote
        updatedAt={quote?.fetchedAt ?? null}
        usdBrl={usdBrl}
        hasStale={quote?.stale ?? false}
        missing={!quote && position.quantity > 0 ? 1 : 0}
        now={result.checkedAt}
      />

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-sm">
          <h2 className="font-display text-heading-md text-ink">Excluir ativo</h2>
          <p className="mt-1 text-body-sm text-ink-muted">Remove {asset.ticker} e todas as suas operações.</p>
        </div>
        <ConfirmButton label="Excluir" confirmLabel="Excluir ativo" action={deleteAsset.bind(null, asset.id)} />
      </Card>
    </div>
  );
}
