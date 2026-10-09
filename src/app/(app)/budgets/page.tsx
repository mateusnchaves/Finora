import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Orçamentos" };

export default function BudgetsPage() {
  return (
    <>
      <PageHeader title="Orçamentos" description="Limites mensais por categoria." />
      <EmptyState
        icon="donut_large"
        title="Nenhum orçamento definido"
        description="Em breve você poderá definir um limite por categoria e acompanhar quanto já usou."
      />
    </>
  );
}
