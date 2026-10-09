import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TradeForm } from "@/components/investments/trade-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getHolding } from "@/lib/data/investments";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Editar operação" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditTradePage({ params }: PageProps<"/investments/[id]/trades/[tradeId]/edit">) {
  return (
    <>
      <PageHeader title="Editar operação" />
      <Suspense fallback={<Card className="h-[520px]" aria-hidden="true" />}>
        <EditTrade params={params} />
      </Suspense>
    </>
  );
}

async function EditTrade({ params }: { params: PageProps<"/investments/[id]/trades/[tradeId]/edit">["params"] }) {
  const { id, tradeId } = await params;
  if (!UUID.test(id) || !UUID.test(tradeId)) notFound();
  await connection();
  const result = await getHolding(id);
  const trade = result?.holding.trades.find((t) => t.id === tradeId);
  if (!result || !trade) notFound();

  return (
    <Card>
      <TradeForm
        assets={[]}
        asset={result.holding.asset}
        trade={trade}
        today={todayISO()}
        cancelHref={`/investments/${id}`}
      />
    </Card>
  );
}
