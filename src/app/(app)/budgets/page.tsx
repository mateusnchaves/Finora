import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BudgetMeter } from "@/components/finance/budget-meter";
import { BudgetRow, NewBudgetForm } from "@/components/finance/budget-manager";
import { MonthSwitcher } from "@/components/finance/month-switcher";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { budgetStatus } from "@/lib/budget-status";
import { getBudgetProgress } from "@/lib/data/budgets";
import { getCategories } from "@/lib/data/categories";
import { monthOf, parseMonthParam, todayISO } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Orçamentos" };

export default function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  return (
    <>
      <PageHeader title="Orçamentos" description="Um limite mensal por categoria de despesa." />
      <Suspense fallback={<Card className="h-96" aria-hidden="true" />}>
        <BudgetsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BudgetsContent({ searchParams }: { searchParams: PageProps<"/budgets">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  const today = todayISO();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(params.month, today);
  const isCurrentMonth = month === currentMonth;

  const [budgets, categories] = await Promise.all([getBudgetProgress(month), getCategories()]);
  const withBudget = new Set(budgets.map((b) => b.categoryId));
  const available = categories.filter((c) => c.kind === "expense" && !withBudget.has(c.id));

  const totalLimit = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const over = budgets.filter((b) => budgetStatus(b.spent, b.amount) === "over").length;
  const near = budgets.filter((b) => budgetStatus(b.spent, b.amount) === "near").length;

  return (
    <div className="flex flex-col gap-6">
      <MonthSwitcher month={month} hrefFor={(m) => (m === currentMonth ? "/budgets" : `/budgets?month=${m}`)} />

      {budgets.length === 0 ? (
        <EmptyState
          icon="donut_large"
          title="Nenhum orçamento definido"
          description="Escolha uma categoria e um limite mensal. O Finora avisa quando o gasto chegar perto."
        />
      ) : (
        <>
          <Card>
            <p className="text-label text-ink-muted">Gasto nas categorias com orçamento</p>
            <p className="tabular mt-2 text-figure-md text-ink">
              {formatMoney(totalSpent)} <span className="text-body text-ink-muted">de {formatMoney(totalLimit)}</span>
            </p>
            <p className="mt-2 text-body-sm text-ink-muted">
              {over > 0
                ? `${over} ${over === 1 ? "categoria passou" : "categorias passaram"} do limite`
                : "Nenhuma categoria passou do limite"}
              {near > 0 && ` · ${near} perto do limite`}.
            </p>
          </Card>

          <Card className="px-6 py-2">
            <ul>
              {budgets.map((b) => (
                <BudgetRow key={b.id} id={b.id} name={b.categoryName} amount={b.amount}>
                  <BudgetMeter
                    name={b.categoryName}
                    amount={b.amount}
                    spent={b.spent}
                    isCurrentMonth={isCurrentMonth}
                  />
                </BudgetRow>
              ))}
            </ul>
          </Card>
        </>
      )}

      <NewBudgetForm categories={available} />
    </div>
  );
}
