import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Contas" };

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Contas" description="Conta corrente, carteira e cartão de crédito." />
      <EmptyState
        icon="account_balance_wallet"
        title="Nenhuma conta cadastrada"
        description="Em breve você poderá cadastrar suas contas e ver o saldo de cada uma."
      />
    </>
  );
}
