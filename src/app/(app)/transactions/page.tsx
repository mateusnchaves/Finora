import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Lançamentos" };

export default function TransactionsPage() {
  return (
    <>
      <PageHeader title="Lançamentos" description="Receitas e despesas de todas as contas." />
      <EmptyState
        icon="receipt_long"
        title="Nenhum lançamento ainda"
        description="Em breve você poderá adicionar receitas e despesas aqui ou importar o extrato do banco."
      />
    </>
  );
}
