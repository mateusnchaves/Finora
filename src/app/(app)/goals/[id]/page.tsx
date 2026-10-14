import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContributionForm } from "@/components/finance/contribution-form";
import { goalCaption, GoalMeter, GoalStatusBadge } from "@/components/finance/goal-summary";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { getAccounts } from "@/lib/data/accounts";
import { getContributions, getGoal } from "@/lib/data/goals";
import { todayISO } from "@/lib/dates";
import { formatMoney, formatShortDate, formatSignedMoney } from "@/lib/format";
import { deleteContribution } from "../actions";

export const metadata: Metadata = { title: "Meta" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function GoalPage({ params }: PageProps<"/goals/[id]">) {
  return (
    <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
      <GoalContent params={params} />
    </Suspense>
  );
}

async function GoalContent({ params }: { params: PageProps<"/goals/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await connection();
  const today = todayISO();
  const goal = await getGoal(id, today);
  if (!goal) notFound();

  const [contributions, accounts] = await Promise.all([getContributions(goal.id), getAccounts({ includeArchived: true })]);
  const account = accounts.find((a) => a.id === goal.accountId);
  const { status, expectedNow } = goal.progress;

  return (
    <>
      <PageHeader
        title={goal.name}
        description={account ? `Guardado em ${account.name}` : undefined}
        action={
          <Link href={`/goals/${goal.id}/edit`} className={buttonClasses("ghost")}>
            <Icon name="edit" size={20} />
            Editar meta
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-label text-ink-muted">Guardado</p>
            <GoalStatusBadge status={status} />
          </div>
          <div>
            <p className="tabular font-display text-figure-xl text-ink">{formatMoney(goal.saved)}</p>
            <p className="tabular mt-1 text-body text-ink-muted">de {formatMoney(goal.target)}</p>
          </div>
          <GoalMeter goal={goal} />
          <p className={cn("text-body", status === "overdue" ? "text-negative" : "text-ink")}>{goalCaption(goal)}</p>
          {expectedNow !== null && status !== "overdue" && (
            <p className="text-body-sm text-ink-muted">
              No ritmo certo, hoje a meta teria {formatMoney(expectedNow)}
              {goal.targetDate && ` (prazo: ${formatShortDate(goal.targetDate)} de ${goal.targetDate.slice(0, 4)})`}.
            </p>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">Registrar movimento</CardTitle>
          <ContributionForm goalId={goal.id} today={today} />
        </Card>

        <Card className="px-6 py-4">
          <CardTitle className="mb-2">Histórico ({contributions.length})</CardTitle>
          {contributions.length === 0 ? (
            <p className="py-6 text-body text-ink-muted">Nada guardado ainda. Registre o primeiro valor acima.</p>
          ) : (
            <ul>
              {contributions.map((c) => (
                <li
                  key={c.id}
                  className="grid min-h-11 grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-3 last:border-b-0"
                >
                  <span className="min-w-0">
                    <span className="block text-body text-ink">{c.amount > 0 ? "Guardado" : "Retirado"}</span>
                    <span className="block truncate text-body-sm text-ink-muted">
                      {formatShortDate(c.date)}
                      {c.note && ` · ${c.note}`}
                    </span>
                  </span>
                  <span className={cn("tabular text-body font-semibold", c.amount > 0 ? "text-brand" : "text-ink")}>
                    {formatSignedMoney(c.amount, c.amount > 0 ? "in" : "out")}
                  </span>
                  <ConfirmButton
                    subtle
                    label="Excluir"
                    confirmLabel="Confirmar"
                    action={deleteContribution.bind(null, c.id, goal.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
