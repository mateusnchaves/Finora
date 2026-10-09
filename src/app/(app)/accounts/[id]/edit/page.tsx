import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AccountForm } from "@/components/finance/account-form";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getAccount } from "@/lib/data/accounts";
import { formatMoney } from "@/lib/format";
import { deleteAccount } from "../../actions";

export const metadata: Metadata = { title: "Editar conta" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function EditAccountPage({ params }: PageProps<"/accounts/[id]/edit">) {
  return (
    <>
      <PageHeader title="Editar conta" />
      <Suspense fallback={<Card className="h-96" aria-hidden="true" />}>
        <EditAccount params={params} />
      </Suspense>
    </>
  );
}

async function EditAccount({ params }: { params: PageProps<"/accounts/[id]/edit">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const account = await getAccount(id);
  if (!account) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <AccountForm account={account} />
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-label text-ink-muted">Saldo atual</p>
          <p className="tabular mt-1 text-figure-md text-ink">{formatMoney(account.balance)}</p>
          <p className="mt-1 text-body-sm text-ink-muted">
            {account.transactionCount} {account.transactionCount === 1 ? "lançamento" : "lançamentos"}
          </p>
        </div>
        <Link href={`/transactions?account=${account.id}`} className={buttonClasses("secondary")}>
          Ver extrato
        </Link>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-sm">
          <h2 className="font-display text-heading-md text-ink">Excluir conta</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            {account.transactionCount > 0
              ? "Só contas sem lançamentos podem ser excluídas. Para esconder esta, use “Arquivar conta”."
              : "A conta não tem lançamentos e pode ser excluída."}
          </p>
        </div>
        {account.transactionCount === 0 && (
          <ConfirmButton label="Excluir" confirmLabel="Confirmar exclusão" action={deleteAccount.bind(null, account.id)} />
        )}
      </Card>
    </div>
  );
}
