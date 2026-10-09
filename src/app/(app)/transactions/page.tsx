import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { TransactionRow } from "@/components/finance/transaction-list";
import { MonthSwitcher, TransactionFilters } from "@/components/finance/transaction-filters";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getTransactions } from "@/lib/data/transactions";
import { todayISO } from "@/lib/dates";
import { formatDayHeading, formatMoney } from "@/lib/format";
import { groupByDate, summarize } from "@/lib/summary";
import { hasActiveFilters, parseTransactionFilters, transactionsHref } from "@/lib/transaction-filters";

export const metadata: Metadata = { title: "Lançamentos" };

export default function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="Receitas, despesas e transferências de todas as contas."
        action={
          <Link href="/transactions/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Novo lançamento
          </Link>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <TransactionsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TransactionsContent({ searchParams }: { searchParams: PageProps<"/transactions">["searchParams"] }) {
  const params = await searchParams;
  // "Today" depends on when the request happens, so render this part per request.
  await connection();
  const today = todayISO();
  const filters = parseTransactionFilters(params, today);
  const [accounts, categories] = await Promise.all([getAccounts({ includeArchived: true }), getCategories()]);
  const transactions = await getTransactions(filters, { accounts, categories });
  const summary = summarize(transactions);
  const groups = groupByDate(transactions);
  const activeAccounts = accounts.filter((a) => !a.archived || a.id === filters.accountId);

  return (
    <div className="flex flex-col gap-6">
      <MonthSwitcher filters={filters} />
      <TransactionFilters filters={filters} accounts={activeAccounts} categories={categories} />

      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-surface-raised p-4 shadow-card">
        <div>
          <dt className="text-label text-ink-muted">Receitas</dt>
          <dd className="tabular mt-1 text-body font-semibold text-brand">{formatMoney(summary.income)}</dd>
        </div>
        <div>
          <dt className="text-label text-ink-muted">Despesas</dt>
          <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(summary.expenses)}</dd>
        </div>
        <div>
          <dt className="text-label text-ink-muted">Resultado</dt>
          <dd className="tabular mt-1 text-body font-semibold text-ink">{formatMoney(summary.net)}</dd>
        </div>
      </dl>

      {groups.length === 0 ? (
        hasActiveFilters(filters) ? (
          <EmptyState
            icon="search"
            title="Nada encontrado"
            description="Nenhum lançamento combina com estes filtros neste mês. Tente limpar os filtros ou mudar o mês."
            action={
              <Link href={transactionsHref({ month: filters.month })} className={buttonClasses("secondary")}>
                Limpar filtros
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon="receipt_long"
            title="Nenhum lançamento neste mês"
            description="Adicione o primeiro para começar a ver para onde vai o seu dinheiro."
            action={
              <Link href="/transactions/new" className={buttonClasses("primary")}>
                <Icon name="add" size={20} />
                Novo lançamento
              </Link>
            }
          />
        )
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.date} aria-labelledby={`day-${group.date}`}>
              <h2 id={`day-${group.date}`} className="mb-2 px-1 text-label text-ink-muted first-letter:uppercase">
                {formatDayHeading(group.date, today)}
              </h2>
              <Card className="px-6 py-2">
                <ul>
                  {group.items.map((t) => (
                    <TransactionRow key={t.id} transaction={t} href={`/transactions/${t.id}/edit`} showDate={false} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
          <p className="text-center text-body-sm text-ink-muted">
            {transactions.length} {transactions.length === 1 ? "lançamento" : "lançamentos"}
          </p>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="mx-auto h-8 w-48 rounded-sm bg-brand-tint" />
      <div className="h-11 rounded-md bg-brand-tint" />
      <div className="h-20 rounded-lg bg-surface-raised" />
      <div className="h-64 rounded-lg bg-surface-raised" />
    </div>
  );
}
