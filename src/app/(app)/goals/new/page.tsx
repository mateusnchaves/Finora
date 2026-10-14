import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { GoalForm } from "@/components/finance/goal-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getAccounts } from "@/lib/data/accounts";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Nova meta" };

export default function NewGoalPage() {
  return (
    <>
      <PageHeader title="Nova meta" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <NewGoalForm />
      </Suspense>
    </>
  );
}

async function NewGoalForm() {
  await connection();
  const accounts = await getAccounts();
  return (
    <Card>
      <GoalForm accounts={accounts} minDate={todayISO()} />
    </Card>
  );
}
