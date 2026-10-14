import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TransactionForm } from "@/components/finance/transaction-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { getTransaction } from "@/lib/data/transactions";
import { monthOf, todayISO } from "@/lib/dates";
import { deleteInstallmentGroup, deleteTransaction } from "../../actions";

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

  const isInstallment = transaction.installmentNumber !== null;

  return (
    <div className="flex flex-col gap-6">
      {isInstallment && (
        <p role="note" className="flex items-start gap-2 rounded-md bg-brand-tint px-3.5 py-3 text-body-sm text-ink">
          <Icon name="credit_card" size={18} className="mt-px shrink-0 text-brand" />
          Parcela {transaction.installmentNumber} de {transaction.installmentCount}. As alterações valem só para esta
          parcela.
        </p>
      )}
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
          label={isInstallment ? "Excluir esta parcela" : "Excluir"}
          confirmLabel="Confirmar exclusão"
          action={deleteTransaction.bind(null, transaction.id, month)}
        />
      </Card>
      {transaction.installmentGroupId && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-heading-md text-ink">Excluir a compra inteira</h2>
            <p className="mt-1 text-body-sm text-ink-muted">
              Remove as {transaction.installmentCount} parcelas de todas as faturas.
            </p>
          </div>
          <ConfirmButton
            label="Excluir todas as parcelas"
            confirmLabel="Confirmar exclusão"
            action={deleteInstallmentGroup.bind(null, transaction.installmentGroupId, month)}
          />
        </Card>
      )}
    </div>
  );
}
