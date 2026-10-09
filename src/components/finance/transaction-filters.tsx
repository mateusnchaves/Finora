"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Account, Category, TransactionType } from "@/lib/data/types";
import { hasActiveFilters, transactionsHref, type TransactionFilterValues } from "@/lib/transaction-filters";

const TYPE_CHIPS: { value?: TransactionType; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "expense", label: "Despesas" },
  { value: "income", label: "Receitas" },
  { value: "transfer", label: "Transferências" },
];

const selectClasses = cn(
  "min-h-11 w-full cursor-pointer appearance-none rounded-md border-[1.5px] border-border-strong bg-surface-raised",
  "pr-9 pl-3 text-body text-ink",
);

export function TransactionFilters({
  filters,
  accounts,
  categories,
}: {
  filters: TransactionFilterValues;
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const go = (changes: Partial<TransactionFilterValues>) => router.push(transactionsHref(filters, changes));

  // A category only makes sense for income or expenses of its own kind.
  const visibleCategories =
    filters.type === "income" || filters.type === "expense"
      ? categories.filter((c) => c.kind === filters.type)
      : categories;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Tipo de lançamento" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TYPE_CHIPS.map((chip) => {
          const active = filters.type === chip.value;
          return (
            <Link
              key={chip.label}
              href={transactionsHref(filters, {
                type: chip.value,
                // Drop a category that does not match the new type.
                categoryId: chip.value === "transfer" ? undefined : filters.categoryId,
              })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-pill border-[1.5px] px-4 text-body-sm font-semibold transition-colors",
                active
                  ? "border-brand bg-brand text-on-brand"
                  : "border-border-strong text-ink-muted hover:bg-brand-tint hover:text-ink",
              )}
            >
              {chip.label}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.3fr]">
        <label className="relative">
          <span className="sr-only">Conta</span>
          <select
            className={selectClasses}
            value={filters.accountId ?? ""}
            onChange={(e) => go({ accountId: e.target.value || undefined })}
          >
            <option value="">Todas as contas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-muted"
          />
        </label>

        <label className="relative">
          <span className="sr-only">Categoria</span>
          <select
            className={selectClasses}
            value={filters.categoryId ?? ""}
            disabled={filters.type === "transfer"}
            onChange={(e) => go({ categoryId: e.target.value || undefined })}
          >
            <option value="">Todas as categorias</option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-muted"
          />
        </label>

        <form
          role="search"
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            go({ search: typeof value === "string" && value.trim() ? value.trim() : undefined });
          }}
        >
          <label htmlFor="transaction-search" className="sr-only">
            Buscar pela descrição
          </label>
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="transaction-search"
            key={filters.search ?? ""}
            name="q"
            type="search"
            defaultValue={filters.search}
            placeholder="Buscar, ex.: mercado"
            className="min-h-11 w-full rounded-md border-[1.5px] border-border-strong bg-surface-raised pr-3 pl-10 text-body text-ink placeholder:text-ink-muted/70"
          />
        </form>
      </div>

      {hasActiveFilters(filters) && (
        <Link
          href={transactionsHref({ month: filters.month })}
          className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
        >
          <Icon name="filter_alt_off" size={18} />
          Limpar filtros
        </Link>
      )}
    </div>
  );
}
