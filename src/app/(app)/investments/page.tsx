import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AllocationCard, HoldingsByClass, PortfolioSummary, QuotesFootnote } from "@/components/investments/portfolio";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getPortfolio } from "@/lib/data/investments";

export const metadata: Metadata = { title: "Investimentos" };

export default function InvestmentsPage() {
  return (
    <>
      <PageHeader
        title="Investimentos"
        description="Ações, FIIs, ETFs, ativos dos EUA e cripto, com cotação do dia."
        action={
          <Link href="/investments/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Nova operação
          </Link>
        }
      />
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioContent />
      </Suspense>
    </>
  );
}

async function PortfolioContent() {
  await connection();
  const portfolio = await getPortfolio();

  if (portfolio.holdings.length === 0) {
    return (
      <EmptyState
        icon="trending_up"
        title="Nenhum investimento ainda"
        description="Registre a primeira compra, como 100 ações de PETR4 ou 0,01 BTC. O Finora busca a cotação e calcula o preço médio."
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
      <PortfolioSummary portfolio={portfolio} />
      <AllocationCard portfolio={portfolio} />
      <HoldingsByClass holdings={portfolio.holdings} />
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
