import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GoalSummary } from "@/components/finance/goal-summary";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getGoals } from "@/lib/data/goals";
import { todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Metas" };

export default function GoalsPage() {
  return (
    <>
      <PageHeader
        title="Metas"
        description="Separe dinheiro para o que importa e acompanhe o ritmo."
        action={
          <Link href="/goals/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Nova meta
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-80" aria-hidden="true" />}>
        <GoalsContent />
      </Suspense>
    </>
  );
}

async function GoalsContent() {
  await connection();
  const goals = await getGoals(todayISO());

  if (goals.length === 0) {
    return (
      <EmptyState
        icon="flag"
        title="Nenhuma meta ainda"
        description="Crie uma meta, como uma viagem ou a reserva de emergência, e registre quanto guardou a cada mês."
        action={
          <Link href="/goals/new" className={buttonClasses("primary")}>
            Criar meta
          </Link>
        }
      />
    );
  }

  const saved = goals.reduce((sum, g) => sum + g.saved, 0);
  const target = goals.reduce((sum, g) => sum + g.target, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-label text-ink-muted">Guardado nas metas</p>
        <p className="tabular mt-2 font-display text-figure-xl text-ink">{formatMoney(saved)}</p>
        <p className="mt-3 text-body-sm text-ink-muted">
          De {formatMoney(target)} somando todas as metas. Os valores separados não saem das suas contas.
        </p>
      </Card>
      <Card className="px-6 py-2">
        <ul>
          {goals.map((goal) => (
            <GoalSummary key={goal.id} goal={goal} />
          ))}
        </ul>
      </Card>
    </div>
  );
}
