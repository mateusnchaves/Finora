import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TradeForm } from "@/components/investments/trade-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getAssets } from "@/lib/data/investments";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Nova operação" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NewTradePage({ searchParams }: PageProps<"/investments/new">) {
  return (
    <>
      <PageHeader title="Nova operação" description="Registre uma compra ou venda. A cotação do dia é buscada sozinha." />
      <Suspense fallback={<Card className="h-[520px]" aria-hidden="true" />}>
        <NewTrade searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewTrade({ searchParams }: { searchParams: PageProps<"/investments/new">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  const assets = await getAssets();

  const assetParam = typeof params.asset === "string" && UUID.test(params.asset) ? params.asset : undefined;
  const fixed = assetParam ? assets.find((a) => a.id === assetParam) : undefined;
  if (assetParam && !fixed) notFound();

  return (
    <Card>
      <TradeForm
        assets={assets}
        asset={fixed}
        defaultType={params.type === "sell" ? "sell" : "buy"}
        today={todayISO()}
        cancelHref={fixed ? `/investments/${fixed.id}` : "/investments"}
      />
    </Card>
  );
}
