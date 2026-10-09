import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RecurringForm } from "@/components/finance/recurring-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Nova recorrência" };

export default function NewRecurringPage() {
  return (
    <>
      <PageHeader title="Nova recorrência" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <NewRecurring />
      </Suspense>
    </>
  );
}

async function NewRecurring() {
  await connection();
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return (
    <Card>
      <RecurringForm accounts={accounts} categories={categories} today={todayISO()} />
    </Card>
  );
}
