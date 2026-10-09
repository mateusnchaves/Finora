import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getTransaction } from "@/lib/data/transactions";
import { monthOf, todayISO } from "@/lib/dates";
import { deleteTransaction } from "../../actions";

export const metadata: Metadata = { title: "Editar lançamento" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditTransactionPage({ params }: PageProps<"/transactions/[id]/edit">) {
  return (
    <>
      <PageHeader title="Editar lançamento" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <EditTransactionForm params={params} />
      </Suspense>
    </>
  );
}

async function EditTransactionForm({ params }: { params: PageProps<"/transactions/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [accounts, categories] = await Promise.all([getAccounts({ includeArchived: true }), getCategories()]);
  const transaction = await getTransaction(id, { accounts, categories });
  if (!transaction) notFound();

  // Archived accounts stay selectable only if this transaction already uses them.
  const selectableAccounts = accounts.filter(
    (a) => !a.archived || a.id === transaction.accountId || a.id === transaction.transferAccountId,
  );
  const month = monthOf(transaction.date);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <TransactionForm
          accounts={selectableAccounts}
          categories={categories}
          transaction={transaction}
          defaultDate={todayISO()}
          cancelHref={`/transactions?month=${month}`}
        />
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-heading-md text-ink">Excluir lançamento</h2>
          <p className="mt-1 text-body-sm text-ink-muted">Ele sai do extrato e dos saldos. Não dá para desfazer.</p>
        </div>
        <ConfirmButton
          label="Excluir"
          confirmLabel="Confirmar exclusão"
          action={deleteTransaction.bind(null, transaction.id, month)}
        />
      </Card>
    </div>
  );
}
