import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { CategoryAvatar } from "@/components/finance/transaction-list";
import type { CategorySpending } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/format";
import { UNCATEGORIZED } from "@/lib/summary";
import { transactionsHref } from "@/lib/transaction-filters";

const VISIBLE_CATEGORIES = 6;

/*
 * "Para onde foi o dinheiro": magnitude per category, so one hue (brand) on
 * a same-hue track, sorted largest first. Bars beat a donut here: lengths on
 * a shared baseline compare precisely and need no categorical palette.
 * Past six categories the tail folds into "Outras".
 */
export function SpendingBreakdown({ month, categories }: { month: string; categories: CategorySpending[] }) {
  const total = categories.reduce((sum, c) => sum + c.total, 0);
  const visible = categories.slice(0, VISIBLE_CATEGORIES);
  const rest = categories.slice(VISIBLE_CATEGORIES);
  const restTotal = rest.reduce((sum, c) => sum + c.total, 0);
  const largest = categories[0]?.total ?? 0;

  return (
    <Card>
      <CardTitle>Para onde foi o dinheiro</CardTitle>
      <p className="mt-1 mb-5 text-body-sm text-ink-muted">
        {total > 0 ? `Despesas do mês por categoria, ${formatMoney(total)} no total.` : "Nenhuma despesa neste mês."}
      </p>

      <ul className="flex flex-col gap-1">
        {visible.map((c) => (
          <Row
            key={c.categoryId ?? "none"}
            name={c.name ?? UNCATEGORIZED}
            total={c.total}
            share={total ? c.total / total : 0}
            scale={largest ? c.total / largest : 0}
            count={c.count}
            href={c.categoryId ? transactionsHref({ month, type: "expense", categoryId: c.categoryId }) : undefined}
          />
        ))}
        {rest.length > 0 && (
          <Row
            name={`Outras (${rest.length})`}
            total={restTotal}
            share={total ? restTotal / total : 0}
            scale={largest ? restTotal / largest : 0}
            count={rest.reduce((sum, c) => sum + c.count, 0)}
            href={transactionsHref({ month, type: "expense" })}
          />
        )}
      </ul>
    </Card>
  );
}

function Row({
  name,
  total,
  share,
  scale,
  count,
  href,
}: {
  name: string;
  total: number;
  share: number;
  scale: number;
  count: number;
  href?: string;
}) {
  const percent = Math.round(share * 100);
  const content = (
    <>
      <CategoryAvatar name={name} />
      <span className="min-w-0 flex-1">
        <span className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="truncate text-body text-ink">{name}</span>
          <span className="tabular shrink-0 text-body-sm text-ink-muted">
            <span className="font-semibold text-ink">{formatMoney(total)}</span> · {percent}%
          </span>
        </span>
        {/* Bar length is relative to the largest category; the label carries the share. */}
        <span className="block h-2 overflow-hidden rounded-sm bg-brand-tint" aria-hidden="true">
          <span className="block h-full rounded-sm bg-brand" style={{ width: `${Math.max(scale * 100, 1.5)}%` }} />
        </span>
        <span className="sr-only">
          {percent}% das despesas, {count} {count === 1 ? "lançamento" : "lançamentos"}
        </span>
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="group -mx-3 flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-brand-tint/60"
        >
          {content}
          <Icon
            name="chevron_right"
            size={20}
            className="text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </Link>
      ) : (
        <div className="flex min-h-11 items-center gap-3 py-2.5">{content}</div>
      )}
    </li>
  );
}
