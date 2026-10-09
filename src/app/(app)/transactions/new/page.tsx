import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Novo lançamento" };

export default function NewTransactionPage() {
  return (
    <>
      <PageHeader title="Novo lançamento" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <NewTransactionForm />
      </Suspense>
    </>
  );
}

async function NewTransactionForm() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="account_balance_wallet"
        title="Cadastre uma conta primeiro"
        description="Todo lançamento sai de ou entra em uma conta, como a conta corrente ou a carteira."
        action={
          <Link href="/accounts/new" className={buttonClasses("primary")}>
            Adicionar conta
          </Link>
        }
      />
    );
  }

  return (
    <Card>
      <TransactionForm
        accounts={accounts}
        categories={categories}
        defaultDate={todayISO()}
        cancelHref="/transactions"
      />
    </Card>
  );
}
