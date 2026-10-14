import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { getAccounts } from "@/lib/data/accounts";
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from "@/lib/data/types";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Contas" };

const TYPE_ICONS: Record<AccountType, IconName> = {
  checking: "account_balance",
  savings: "savings",
  wallet: "wallet",
  credit_card: "credit_card",
};

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        title="Contas"
        description="Conta corrente, poupança, carteira e cartão de crédito."
        action={
          <Link href="/accounts/new" className={buttonClasses("primary")}>
            <Icon name="add" size={20} />
            Nova conta
          </Link>
        }
      />
      <Suspense fallback={<Card className="h-80" aria-hidden="true" />}>
        <AccountsContent />
      </Suspense>
    </>
  );
}

async function AccountsContent() {
  const accounts = await getAccounts({ includeArchived: true });
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon="account_balance_wallet"
        title="Nenhuma conta cadastrada"
        description="Cadastre a conta do banco, a carteira ou o cartão para começar a lançar."
        action={
          <Link href="/accounts/new" className={buttonClasses("primary")}>
            Adicionar conta
          </Link>
        }
      />
    );
  }

  // Money you have minus what you owe on cards.
  const total = active.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <p className="text-label text-ink-muted">Saldo somado das contas</p>
        <p className="tabular mt-2 font-display text-figure-xl text-ink">{formatMoney(total)}</p>
        <p className="mt-3 text-body-sm text-ink-muted">Já descontada a fatura atual dos cartões.</p>
      </Card>

      <Card className="px-6 py-2">
        <ul>
          {active.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </ul>
      </Card>

      {archived.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-1 text-label text-ink-muted">
            <Icon name="inventory_2" size={20} />
            Contas arquivadas ({archived.length})
            <Icon name="expand_more" size={20} className="transition-transform group-open:rotate-180" />
          </summary>
          <Card className="mt-2 px-6 py-2">
            <ul>
              {archived.map((account) => (
                <AccountRow key={account.id} account={account} />
              ))}
            </ul>
          </Card>
        </details>
      )}
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const isCard = account.type === "credit_card";
  // A card's negative balance is its open bill, not an alert.
  const overdrawn = !isCard && account.balance < 0;
  const caption = isCard
    ? account.balance < 0
      ? `Em aberto${account.closingDay ? ` · fecha dia ${account.closingDay}` : ""}`
      : "Sem fatura em aberto"
    : overdrawn
      ? "Saldo negativo"
      : ACCOUNT_TYPE_LABELS[account.type];

  return (
    <li className="border-b border-border last:border-b-0">
      <Link
        // A configured card opens its bill; the edit link is on that page.
        href={isCard && account.closingDay ? `/cards/${account.id}` : `/accounts/${account.id}/edit`}
        className="-mx-3 grid min-h-11 grid-cols-[40px_1fr_auto] items-center gap-3 rounded-md px-3 py-3.5 transition-colors hover:bg-brand-tint/60"
      >
        <span className="grid size-10 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
          <Icon name={TYPE_ICONS[account.type]} size={22} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-medium text-ink">{account.name}</span>
          <span className={cn("block text-body-sm", overdrawn ? "text-negative" : "text-ink-muted")}>
            {caption}
          </span>
        </span>
        <span className={cn("tabular text-right text-body font-semibold", overdrawn ? "text-negative" : "text-ink")}>
          {formatMoney(isCard ? Math.abs(account.balance) : account.balance)}
        </span>
      </Link>
    </li>
  );
}
