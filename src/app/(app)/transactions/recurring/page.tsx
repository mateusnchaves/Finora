import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryAvatar } from "@/components/finance/transaction-list";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getRecurringRules, type RecurringRule } from "@/lib/data/recurring";
import { todayISO } from "@/lib/dates";
import { formatShortDate, formatSignedMoney } from "@/lib/format";
import { nextOccurrence } from "@/lib/recurrence";

export const metadata: Metadata = { title: "Recorrentes" };

export default function RecurringPage() {
  return (
    <>
      <Link
        href="/transactions"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
      >
        <Icon name="arrow_back" size={18} />
        Lançamentos
      </Link>
      <PageHeader
        title="Recorrentes"
        description="Lançados automaticamente todo mês, no dia escolhido."
        action={
          <Link href="/transactions/recurring/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Nova recorrência
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-80" aria-hidden="true" />}>
        <RecurringContent />
      </Suspense>
    </>
  );
}

async function RecurringContent() {
  await connection();
  const today = todayISO();
  const [accounts, categories] = await Promise.all([getAccounts({ includeArchived: true }), getCategories()]);
  const rules = await getRecurringRules({ accounts, categories });

  if (rules.length === 0) {
    return (
      <EmptyState
        icon="event_repeat"
        title="Nenhuma recorrência"
        description="Cadastre o salário, o aluguel e as assinaturas uma vez. O Finora lança todo mês para você."
        action={
          <Link href="/transactions/recurring/new" className={buttonClasses("primary")}>
            Adicionar recorrência
          </Link>
        }
      />
    );
  }

  return (
    <Card className="px-6 py-2">
      <ul>
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} today={today} />
        ))}
      </ul>
    </Card>
  );
}

function RuleRow({ rule, today }: { rule: RecurringRule; today: string }) {
  const next = rule.active ? nextOccurrence(rule, today) : null;
  const status = !rule.active ? "Pausada" : next ? `Próximo: ${formatShortDate(next)}` : "Encerrada";
  const isIncome = rule.type === "income";

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        href={`/transactions/recurring/${rule.id}/edit`}
        className="-mx-3 grid min-h-11 grid-cols-[40px_1fr_auto] items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-brand-tint/60"
      >
        <CategoryAvatar name={rule.categoryName} />
        <span className="min-w-0">
          <span className={cn("block truncate text-body font-medium", rule.active ? "text-ink" : "text-ink-muted")}>
            {rule.description}
          </span>
          <span className="block truncate text-body-sm text-ink-muted">
            Todo dia {rule.dayOfMonth} · {rule.accountName} · {status}
          </span>
        </span>
        <span className={cn("tabular text-right text-body font-semibold", isIncome ? "text-brand" : "text-ink")}>
          {formatSignedMoney(rule.amount, isIncome ? "in" : "out")}
        </span>
      </Link>
    </li>
  );
}
