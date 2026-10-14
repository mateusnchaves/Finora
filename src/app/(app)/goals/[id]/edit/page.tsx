import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { GoalForm } from "@/components/finance/goal-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getAccounts } from "@/lib/data/accounts";
import { getGoal } from "@/lib/data/goals";
import { todayISO } from "@/lib/dates";
import { deleteGoal } from "../../actions";

export const metadata: Metadata = { title: "Editar meta" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditGoalPage({ params }: PageProps<"/goals/[id]/edit">) {
  return (
    <>
      <PageHeader title="Editar meta" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <EditGoalForm params={params} />
      </Suspense>
    </>
  );
}

async function EditGoalForm({ params }: { params: PageProps<"/goals/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await connection();
  const today = todayISO();
  const [goal, accounts] = await Promise.all([getGoal(id, today), getAccounts()]);
  if (!goal) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <GoalForm goal={goal} accounts={accounts} minDate={today} />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-heading-md text-ink">Excluir meta</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            Apaga a meta e o histórico dela. Suas contas não mudam. Não dá para desfazer.
          </p>
        </div>
        <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" action={deleteGoal.bind(null, goal.id)} />
      </Card>
    </div>
  );
}
