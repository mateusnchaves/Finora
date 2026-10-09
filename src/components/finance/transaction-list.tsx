import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { TransactionItem } from "@/lib/data/types";
import { formatMoney, formatShortDate, formatSignedMoney } from "@/lib/format";
import { UNCATEGORIZED } from "@/lib/summary";
import { categoryIcon, categoryInitials } from "@/lib/category-icons";
import { cn } from "@/lib/cn";

/** Category icon in a tinted circle; transfers get arrows, unknown categories initials. */
export function CategoryAvatar({ name, transfer = false }: { name: string | null; transfer?: boolean }) {
  const icon = transfer ? "swap_horiz" : categoryIcon(name);
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-pill bg-brand-tint text-label text-brand"
    >
      {icon ? <Icon name={icon} size={20} /> : categoryInitials(name ?? UNCATEGORIZED)}
    </span>
  );
}

function Amount({ transaction }: { transaction: TransactionItem }) {
  if (transaction.type === "transfer") {
    // Moving money between your own accounts is neither in nor out.
    return <span className="text-ink-muted">{formatMoney(transaction.amount)}</span>;
  }
  const isIncome = transaction.type === "income";
  return (
    <span className={isIncome ? "text-brand" : "text-ink"}>
      {formatSignedMoney(transaction.amount, isIncome ? "in" : "out")}
    </span>
  );
}

/**
 * One movement: category avatar, title with "Categoria · data", signed amount.
 * With `href` the whole row is a link (min 44px tall).
 */
export function TransactionRow({
  transaction,
  href,
  showDate = true,
}: {
  transaction: TransactionItem;
  href?: string;
  showDate?: boolean;
}) {
  const isTransfer = transaction.type === "transfer";
  const label = isTransfer
    ? `${transaction.accountName} → ${transaction.transferAccountName}`
    : (transaction.categoryName ?? UNCATEGORIZED);
  const meta = showDate ? `${label} · ${formatShortDate(transaction.date)}` : label;

  const content = (
    <>
      <CategoryAvatar name={transaction.categoryName} transfer={isTransfer} />
      <span className="min-w-0">
        <span className="block truncate text-body font-medium text-ink">{transaction.description}</span>
        <span className="block truncate text-body-sm text-ink-muted">{meta}</span>
      </span>
      <span className="tabular text-right text-body font-semibold">
        <Amount transaction={transaction} />
      </span>
    </>
  );

  const rowClasses = "grid min-h-11 grid-cols-[40px_1fr_auto] items-center gap-3 py-3";

  return (
    <li className="border-b border-border last:border-b-0">
      {href ? (
        <Link
          href={href}
          className={cn(rowClasses, "-mx-3 rounded-md px-3 transition-colors duration-150 hover:bg-brand-tint/60")}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClasses}>{content}</div>
      )}
    </li>
  );
}

export function TransactionList({
  title,
  transactions,
  moreHref,
  emptyText,
}: {
  title: string;
  transactions: TransactionItem[];
  /** "Ver todos" link under the list. */
  moreHref?: string;
  emptyText: string;
}) {
  return (
    <Card>
      <CardTitle className="mb-2">{title}</CardTitle>
      {transactions.length === 0 ? (
        <p className="py-4 text-body text-ink-muted">{emptyText}</p>
      ) : (
        <ul>
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} href={`/transactions/${t.id}/edit`} />
          ))}
        </ul>
      )}
      {moreHref && transactions.length > 0 && (
        <Link
          href={moreHref}
          className="-mx-2 mt-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
        >
          Ver todos os lançamentos
          <Icon name="chevron_right" size={18} />
        </Link>
      )}
    </Card>
  );
}
