import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Investimentos" };

export default function InvestmentsPage() {
  return (
    <>
      <PageHeader title="Investimentos" description="Ações, FIIs, renda fixa, cripto e ativos internacionais." />
      <EmptyState
        icon="trending_up"
        title="Nenhum investimento cadastrado"
        description="Em breve você poderá registrar suas compras e acompanhar o valor atualizado da carteira."
      />
    </>
  );
}
