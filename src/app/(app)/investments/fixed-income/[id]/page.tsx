import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FixedIncomeForm } from "@/components/investments/fixed-income-form";
import { maturityText } from "@/components/investments/fixed-income-list";
import { Result } from "@/components/investments/portfolio";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import { getFixedIncomeItem } from "@/lib/data/fixed-income";
import { todayISO } from "@/lib/dates";
import { describeRate, FIXED_INCOME_KINDS } from "@/lib/fixed-income/kinds";
import { formatMoney, formatShortDate } from "@/lib/format";
import { deleteFixedIncome } from "../actions";

export const metadata: Metadata = { title: "Renda fixa" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function FixedIncomePage({ params }: PageProps<"/investments/fixed-income/[id]">) {
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
        <FixedIncomeContent params={params} />
      </Suspense>
    </>
  );
}

async function FixedIncomeContent({ params }: { params: PageProps<"/investments/fixed-income/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await connection();
  const result = await getFixedIncomeItem(id);
  if (!result) notFound();

  const { item, ratesAsOf } = result;
  const v = item.valuation;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-label text-ink-muted">{FIXED_INCOME_KINDS[item.kind].label}</p>
        <h1 className="font-display text-heading-lg text-ink">{item.name}</h1>
        <p className="text-body text-ink-muted">
          {describeRate(item.index, item.rate)} · {maturityText(item)}
        </p>
      </header>

      {v.missingRates && (
        <p role="status" className="flex items-center gap-2 rounded-md bg-brand-tint px-4 py-3 text-body-sm text-ink">
          <Icon name="sync_problem" size={18} />
          Não conseguimos baixar o índice do Banco Central agora. Os valores abaixo mostram só o valor aplicado; tente
          recarregar em alguns minutos.
        </p>
      )}

      <Card>
        <p className="text-label text-ink-muted">{v.matured ? "Valor no vencimento" : "Valor bruto hoje"}</p>
        <p className="tabular mt-1 text-figure-md text-ink">{formatMoney(v.grossValue)}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-label text-ink-muted">Valor aplicado</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(item.principal)}</dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Rendimento bruto</dt>
            <dd className="mt-1">
              <Result amount={v.gain} percent={v.gainPercent} />
            </dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">
              {item.taxExempt ? "Imposto de renda" : `IR estimado (${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v.taxRate * 100)}%)`}
            </dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">
              {item.taxExempt ? "Isento" : formatMoney(v.incomeTax)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Valor líquido estimado</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(v.netValue)}</dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Dias úteis corridos</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">{v.businessDays}</dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted">Aplicado em</dt>
            <dd className="tabular mt-1 text-body font-semibold text-ink">
              {formatShortDate(item.startDate)} {item.startDate.slice(0, 4)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-body-sm text-ink-muted">
          Calculado com {item.index === "ipca" ? "IPCA e o calendário do CDI" : item.index === "selic" ? "a Selic" : "o CDI"}{" "}
          do Banco Central
          {ratesAsOf && ` até ${formatShortDate(ratesAsOf)}`}. É uma estimativa: o valor do banco ou do Tesouro pode
          variar por arredondamentos, IOF nos primeiros 30 dias e, no Tesouro, pela marcação a mercado.
        </p>
      </Card>

      <Card>
        <CardTitle className="mb-4">Editar aplicação</CardTitle>
        <FixedIncomeForm item={item} today={todayISO()} />
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-sm">
          <h2 className="font-display text-heading-md text-ink">Excluir aplicação</h2>
          <p className="mt-1 text-body-sm text-ink-muted">Use quando resgatar ou se cadastrou por engano.</p>
        </div>
        <ConfirmButton label="Excluir" confirmLabel="Excluir aplicação" action={deleteFixedIncome.bind(null, item.id)} />
      </Card>
    </div>
  );
}
