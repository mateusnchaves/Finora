import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BalanceCard } from "@/components/finance/balance-card";
import { MonthSwitcher } from "@/components/finance/month-switcher";
import { MonthlyChart } from "@/components/finance/monthly-chart";
import { SpendingBreakdown } from "@/components/finance/spending-breakdown";
import { TransactionList } from "@/components/finance/transaction-list";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getExpensesBetween, getHighlights, getMonthlyTotals, getSpendingByCategory } from "@/lib/data/dashboard";
import { monthOf, parseMonthParam, sameDayIn, shiftMonth, todayISO } from "@/lib/dates";
import { formatMoney, formatMonth, monthName } from "@/lib/format";
import { transactionsHref } from "@/lib/transaction-filters";

export const metadata: Metadata = { title: "Visão geral" };

const CHART_MONTHS = 6;

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader
        title="Visão geral"
        action={
          <Link href="/transactions/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Novo lançamento
          </Link>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** One sentence comparing this period's expenses with the previous one. */
function comparisonText(current: number, previous: number, period: string) {
  if (previous === 0) return undefined;
  const diff = previous - current;
  if (Math.abs(diff) < 0.01) return `Você gastou o mesmo que ${period}.`;
  return diff > 0
    ? `Você gastou ${formatMoney(diff)} a menos que ${period}.`
    : `Você gastou ${formatMoney(-diff)} a mais que ${period}.`;
}

async function DashboardContent({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const params = await searchParams;
  // "Today" depends on when the request happens, so render this part per request.
  await connection();
  const today = todayISO();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(params.month, today);
  const hrefFor = (m: string) => (m === currentMonth ? "/dashboard" : `/dashboard?month=${m}`);

  const isCurrentMonth = month === currentMonth;
  const previous = shiftMonth(month, -1);
  const previousName = monthName(Number(previous.slice(5, 7)));
  const todayDay = Number(today.slice(8, 10));

  const [accounts, categories, monthly, spending, previousSamePeriod] = await Promise.all([
    getAccounts(),
    getCategories(),
    getMonthlyTotals(month, CHART_MONTHS),
    getSpendingByCategory(month),
    // A month in progress is compared with the same days of the previous month.
    isCurrentMonth ? getExpensesBetween(`${previous}-01`, sameDayIn(previous, todayDay)) : null,
  ]);
  const { topExpenses, latest } = await getHighlights(month, { accounts, categories });

  const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const thisMonth = monthly.at(-1)!;
  const previousMonth = monthly.at(-2);
  const comparison = isCurrentMonth
    ? comparisonText(thisMonth.expenses, previousSamePeriod ?? 0, `entre os dias 1 e ${todayDay} de ${previousName}`)
    : previousMonth && comparisonText(thisMonth.expenses, previousMonth.expenses, `em ${previousName}`);
  const hasAnyMovement = monthly.some((m) => m.income > 0 || m.expenses > 0);

  if (accounts.length === 0 || (!hasAnyMovement && isCurrentMonth)) {
    return <Onboarding hasAccounts={accounts.length > 0} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <MonthSwitcher month={month} hrefFor={hrefFor} />

      <BalanceCard
        balance={balance}
        income={thisMonth.income}
        expenses={thisMonth.expenses}
        monthLabel={isCurrentMonth ? "Neste mês" : `Em ${formatMonth(month)}`}
        comparison={comparison}
      />

      <SpendingBreakdown month={month} categories={spending} />

      <MonthlyChart data={monthly} currentMonth={month} />

      <TransactionList
        title="Maiores gastos do mês"
        transactions={topExpenses}
        emptyText="Nenhuma despesa neste mês."
        moreHref={transactionsHref({ month, type: "expense" })}
      />

      <TransactionList
        title="Últimas movimentações"
        transactions={latest}
        emptyText="Nenhuma movimentação neste mês."
        moreHref={transactionsHref({ month })}
      />
    </div>
  );
}

function Onboarding({ hasAccounts }: { hasAccounts: boolean }) {
  return hasAccounts ? (
    <EmptyState
      icon="receipt_long"
      title="Seu resumo começa aqui"
      description="Adicione o primeiro lançamento, como o salário ou a conta de luz, e o Finora mostra para onde vai o seu dinheiro."
      action={
        <Link href="/transactions/new" className={buttonClasses("primary")}>
          <Icon name="add" size={20} />
          Adicionar lançamento
        </Link>
      }
    />
  ) : (
    <EmptyState
      icon="account_balance_wallet"
      title="Cadastre sua primeira conta"
      description="Comece pela conta do banco ou pela carteira. Depois é só lançar receitas e despesas."
      action={
        <Link href="/accounts/new" className={buttonClasses("primary")}>
          Adicionar conta
        </Link>
      }
    />
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="mx-auto h-8 w-48 rounded-sm bg-brand-tint" />
      <Card className="h-56" />
      <Card className="h-80" />
      <Card className="h-72" />
    </div>
  );
}
