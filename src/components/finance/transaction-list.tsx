import { Card, CardTitle } from "@/components/ui/card";
import { formatShortDate, formatSignedMoney } from "@/lib/format";
import type { Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/cn";

/** "Alimentação" -> "AL", "Contas da casa" -> "CD" */
function initials(text: string) {
  const words = text.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

/** One movement: category avatar, title with "Categoria · data", signed amount. */
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === "income";
  return (
    <li className="grid min-h-11 grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-pill bg-brand-tint text-label text-brand"
      >
        {initials(transaction.category)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-body font-medium text-ink">{transaction.description}</p>
        <p className="text-body-sm text-ink-muted">
          {transaction.category} · {formatShortDate(transaction.date)}
        </p>
      </div>
      <p className={cn("tabular text-right text-body font-semibold", isIncome ? "text-brand" : "text-ink")}>
        {formatSignedMoney(transaction.amount, isIncome ? "in" : "out")}
      </p>
    </li>
  );
}

export function TransactionList({ title, transactions }: { title: string; transactions: Transaction[] }) {
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
