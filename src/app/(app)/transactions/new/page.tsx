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
import type { Account } from "@/lib/data/types";
import { todayISO } from "@/lib/dates";
import { formatMoneyInput, parseMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Novo lançamento" };

export default function NewTransactionPage({ searchParams }: PageProps<"/transactions/new">) {
  return (
    <>
      <PageHeader title="Novo lançamento" />
      <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
        <NewTransactionForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Optional prefill from the URL: ?type=transfer&to=<card>&amount=1234.56&description=… */
function defaultsFrom(params: Record<string, string | string[] | undefined>, accounts: Account[]) {
  const text = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  const amount = parseMoney(text("amount")?.replace(".", ",") ?? "");
  const type = text("type");
  const to = accounts.some((a) => a.id === text("to")) ? text("to") : undefined;
  // Pay from the first bank account, never from the card itself.
  const from = to ? accounts.find((a) => a.id !== to && a.type !== "credit_card") : undefined;
  return {
    ...(type === "transfer" || type === "income" || type === "expense" ? { type } : {}),
    ...(to ? { transferAccountId: to } : {}),
    ...(from ? { accountId: from.id } : {}),
    ...(amount ? { amount: formatMoneyInput(amount) } : {}),
    ...(text("description") ? { description: text("description")!.slice(0, 120) } : {}),
  };
}

async function NewTransactionForm({ searchParams }: { searchParams: PageProps<"/transactions/new">["searchParams"] }) {
  const [accounts, categories, params] = await Promise.all([getAccounts(), getCategories(), searchParams]);

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
        defaults={defaultsFrom(params, accounts)}
      />
    </Card>
  );
}
