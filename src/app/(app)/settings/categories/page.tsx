import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategorySection } from "@/components/finance/category-manager";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getCategories, getCategoryUsage } from "@/lib/data/categories";

export const metadata: Metadata = { title: "Categorias" };

export default function CategoriesPage() {
  return (
    <>
      <Link
        href="/settings"
        className="-ml-2 mb-4 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
      >
        <Icon name="arrow_back" size={18} />
        Configurações
      </Link>
      <PageHeader title="Categorias" description="Organize receitas e despesas do seu jeito." />
      <Suspense fallback={<Card className="h-96" aria-hidden="true" />}>
        <CategoriesContent />
      </Suspense>
    </>
  );
}

async function CategoriesContent() {
  const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
  const usageRecord = Object.fromEntries(usage);

  return (
    <div className="flex flex-col gap-6">
      <CategorySection
        kind="expense"
        title="Despesas"
        categories={categories.filter((c) => c.kind === "expense")}
        usage={usageRecord}
      />
      <CategorySection
        kind="income"
        title="Receitas"
        categories={categories.filter((c) => c.kind === "income")}
        usage={usageRecord}
      />
    </div>
  );
}
