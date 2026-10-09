import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RecurringForm } from "@/components/finance/recurring-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getRecurringRule } from "@/lib/data/recurring";
import { todayISO } from "@/lib/dates";
import { deleteRecurringRule } from "../../actions";

export const metadata: Metadata = { title: "Editar recorrência" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditRecurringPage({ params }: PageProps<"/transactions/recurring/[id]/edit">) {
  return (
    <>
      <PageHeader title="Editar recorrência" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <EditRecurring params={params} />
      </Suspense>
    </>
  );
}

async function EditRecurring({ params }: { params: PageProps<"/transactions/recurring/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await connection();

  const [accounts, categories] = await Promise.all([getAccounts({ includeArchived: true }), getCategories()]);
  const rule = await getRecurringRule(id, { accounts, categories });
  if (!rule) notFound();

  const selectableAccounts = accounts.filter((a) => !a.archived || a.id === rule.accountId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <RecurringForm rule={rule} accounts={selectableAccounts} categories={categories} today={todayISO()} />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-sm">
          <h2 className="font-display text-heading-md text-ink">Excluir recorrência</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            Os lançamentos já criados continuam no extrato. Só param de surgir novos.
          </p>
        </div>
        <ConfirmButton
          label="Excluir"
          confirmLabel="Confirmar exclusão"
          action={deleteRecurringRule.bind(null, rule.id)}
        />
      </Card>
    </div>
  );
}
