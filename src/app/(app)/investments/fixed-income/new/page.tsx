import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { FixedIncomeForm } from "@/components/investments/fixed-income-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Nova aplicação de renda fixa" };

export default function NewFixedIncomePage() {
  return (
    <>
      <PageHeader
        title="Renda fixa"
        description="CDB, LCI/LCA ou Tesouro. O valor é atualizado com o CDI, a Selic ou o IPCA do Banco Central."
      />
      <Suspense fallback={<Card className="h-[480px]" aria-hidden="true" />}>
        <NewFixedIncome />
      </Suspense>
    </>
  );
}

async function NewFixedIncome() {
  await connection();
  return (
    <Card>
      <FixedIncomeForm today={todayISO()} />
    </Card>
  );
}
