import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ImportWizard } from "@/components/finance/import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";

export const metadata: Metadata = { title: "Importar extrato" };

export default function ImportPage() {
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
        title="Importar extrato"
        description="Envie o OFX ou CSV do banco. As categorias são sugeridas e os duplicados, detectados."
      />
      <Suspense fallback={<Card className="h-96" aria-hidden="true" />}>
        <ImportContent />
      </Suspense>
    </>
  );
}

async function ImportContent() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="account_balance_wallet"
        title="Cadastre uma conta primeiro"
        description="O extrato entra em uma conta, como a conta corrente ou o cartão."
        action={
          <Link href="/accounts/new" className={buttonClasses("primary")}>
            Adicionar conta
          </Link>
        }
      />
    );
  }
  return <ImportWizard accounts={accounts} categories={categories} />;
}
