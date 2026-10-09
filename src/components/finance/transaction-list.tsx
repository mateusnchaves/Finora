import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { TransactionItem } from "@/lib/data/types";
import { formatMoney, formatShortDate, formatSignedMoney } from "@/lib/format";
import { UNCATEGORIZED } from "@/lib/summary";
import { cn } from "@/lib/cn";

/** "Alimentação" -> "AL", "Contas da casa" -> "CD" */
function initials(text: string) {
  const words = text.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
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
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-pill bg-brand-tint text-label text-brand"
      >
        {isTransfer ? <Icon name="swap_horiz" size={20} /> : initials(transaction.categoryName ?? UNCATEGORIZED)}
      </span>
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

export function TransactionList({ title, transactions }: { title: string; transactions: TransactionItem[] }) {
  return (
    <Card>
      <CardTitle className="mb-2">{title}</CardTitle>
      <ul>
        {transactions.map((t) => (
          <TransactionRow key={t.id} transaction={t} />
        ))}
      </ul>
    </Card>
  );
}
