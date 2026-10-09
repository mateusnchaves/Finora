import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FixedIncomeList } from "@/components/investments/fixed-income-list";
import { AllocationCard, HoldingsByClass, PortfolioSummary, QuotesFootnote } from "@/components/investments/portfolio";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getInvestmentsOverview } from "@/lib/data/investments-overview";
import { formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Investimentos" };

export default function InvestmentsPage() {
  return (
    <>
      <PageHeader
        title="Investimentos"
        description="Ações, FIIs, ETFs, exterior, cripto e renda fixa, com valores do dia."
        action={
          <Link href="/investments/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Nova operação
          </Link>
        }
      />
      <div className="-mt-4 mb-6 flex flex-wrap gap-2">
        <Link href="/investments/fixed-income/new" className={buttonClasses("secondary")}>
          <Icon name="savings" size={20} />
          Adicionar renda fixa
        </Link>
      </div>
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioContent />
      </Suspense>
    </>
  );
}

async function PortfolioContent() {
  await connection();
  const { portfolio, fixedIncome, totals, allocation, isEmpty } = await getInvestmentsOverview();

  if (isEmpty) {
    return (
      <EmptyState
        icon="trending_up"
        title="Nenhum investimento ainda"
        description="Registre uma compra, como 100 ações de PETR4 ou 0,01 BTC, ou uma aplicação de renda fixa, como um CDB a 110% do CDI."
        action={
          <Link href="/investments/new" className={buttonClasses("primary")}>
            Registrar compra
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PortfolioSummary totals={totals} />
      <AllocationCard items={allocation} />
      <HoldingsByClass holdings={portfolio.holdings} />
      {fixedIncome.items.length > 0 && <FixedIncomeList items={fixedIncome.items} />}
      {portfolio.closed.length > 0 && (
        <p className="px-1 text-body-sm text-ink-muted">
          Posições encerradas:{" "}
          {portfolio.closed.map((h, i) => (
            <span key={h.asset.id}>
              {i > 0 && ", "}
              <Link href={`/investments/${h.asset.id}`} className="font-semibold text-brand hover:underline">
                {h.asset.ticker}
              </Link>
            </span>
          ))}
          .
        </p>
      )}
      <QuotesFootnote
        updatedAt={portfolio.updatedAt}
        usdBrl={portfolio.usdBrl}
        hasStale={portfolio.hasStaleQuotes}
        missing={portfolio.missingQuotes}
        now={portfolio.checkedAt}
      />
      {fixedIncome.items.length > 0 && fixedIncome.ratesAsOf && (
        <p className="-mt-4 text-body-sm text-ink-muted">
          Renda fixa calculada com CDI, Selic e IPCA do Banco Central até {formatShortDate(fixedIncome.ratesAsOf)}, em
          valores brutos (antes do imposto de renda).
        </p>
      )}
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <Card className="h-52" />
      <Card className="h-64" />
      <Card className="h-80" />
    </div>
  );
}
