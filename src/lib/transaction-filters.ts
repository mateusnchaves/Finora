import { parseMonthParam } from "@/lib/dates";
import type { TransactionType } from "@/lib/data/types";

export type TransactionFilterValues = {
  month: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  search?: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set<string>(["income", "expense", "transfer"]);

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

/** Reads filters from the URL, dropping anything malformed. */
export function parseTransactionFilters(params: SearchParams, today?: string): TransactionFilterValues {
  const type = single(params.type);
  const accountId = single(params.account);
  const categoryId = single(params.category);
  const search = single(params.q)?.trim().slice(0, 80);
  return {
    month: parseMonthParam(params.month, today),
    type: type && TYPES.has(type) ? (type as TransactionType) : undefined,
    accountId: accountId && UUID.test(accountId) ? accountId : undefined,
    categoryId: categoryId && UUID.test(categoryId) ? categoryId : undefined,
    search: search || undefined,
  };
}

/** URL for the transactions page with some filters changed. `undefined` removes one. */
export function transactionsHref(
  current: TransactionFilterValues,
  changes: Partial<TransactionFilterValues> = {},
): string {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  params.set("month", next.month);
  if (next.type) params.set("type", next.type);
  if (next.accountId) params.set("account", next.accountId);
  if (next.categoryId) params.set("category", next.categoryId);
  if (next.search) params.set("q", next.search);
  return `/transactions?${params}`;
}

export function hasActiveFilters(filters: TransactionFilterValues) {
  return Boolean(filters.type || filters.accountId || filters.categoryId || filters.search);
}
