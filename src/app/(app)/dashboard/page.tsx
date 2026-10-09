import type { Metadata } from "next";
import { BalanceCard } from "@/components/finance/balance-card";
import { SpendingBreakdown } from "@/components/finance/spending-breakdown";
import { TransactionList } from "@/components/finance/transaction-list";
import { PageHeader } from "@/components/layout/page-header";
import { Icon } from "@/components/ui/icon";
import { buttonClasses } from "@/components/ui/button";
import { formatMoney, monthName } from "@/lib/format";
import {
  SAMPLE_MONTH,
  SAMPLE_OPENING_BALANCE,
  SAMPLE_PREVIOUS_MONTH_EXPENSES,
  SAMPLE_TRANSACTIONS,
} from "@/lib/mock-data";
import { expensesByCategory, summarize } from "@/lib/summary";
import Link from "next/link";

export const metadata: Metadata = { title: "Visão geral" };

function comparisonText(current: number, previous: number, previousMonth: string) {
  const diff = previous - current;
  if (diff === 0) return `Você gastou o mesmo que em ${previousMonth}.`;
  return diff > 0
    ? `Você gastou ${formatMoney(diff)} a menos que em ${previousMonth}.`
    : `Você gastou ${formatMoney(-diff)} a mais que em ${previousMonth}.`;
}

export default function DashboardPage() {
  const { month } = SAMPLE_MONTH;
  const summary = summarize(SAMPLE_TRANSACTIONS);
  const categories = expensesByCategory(SAMPLE_TRANSACTIONS);
  const previousMonth = monthName(month === 1 ? 12 : month - 1);

  return (
    <>
      <PageHeader
        title={`Resumo de ${monthName(month)}`}
        description="Dados de exemplo enquanto o banco de dados não está conectado."
        action={
          <Link href="/transactions" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Adicionar lançamento
          </Link>
        }
      />
      <div className="flex flex-col gap-6">
        <BalanceCard
          balance={SAMPLE_OPENING_BALANCE + summary.net}
          income={summary.income}
          expenses={summary.expenses}
          monthLabel={monthName(month)}
          comparison={comparisonText(summary.expenses, SAMPLE_PREVIOUS_MONTH_EXPENSES, previousMonth)}
        />
        <SpendingBreakdown categories={categories} />
        <TransactionList title="Últimas movimentações" transactions={SAMPLE_TRANSACTIONS.slice(0, 5)} />
      </div>
    </>
  );
}
