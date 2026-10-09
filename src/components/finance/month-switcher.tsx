import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { shiftMonth } from "@/lib/dates";
import { capitalize, formatMonth } from "@/lib/format";

const arrowClasses =
  "inline-flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-brand-tint hover:text-ink";

/** ‹ Outubro de 2026 › — `hrefFor` builds the link for a given yyyy-mm. */
export function MonthSwitcher({ month, hrefFor }: { month: string; hrefFor: (month: string) => string }) {
  const previous = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={hrefFor(previous)} className={arrowClasses}>
        <Icon name="chevron_left" />
        <span className="sr-only">Mês anterior, {formatMonth(previous)}</span>
      </Link>
      <p className="font-display text-heading-md text-ink" aria-live="polite">
        {capitalize(formatMonth(month))}
      </p>
      <Link href={hrefFor(next)} className={arrowClasses}>
        <Icon name="chevron_right" />
        <span className="sr-only">Próximo mês, {formatMonth(next)}</span>
      </Link>
    </div>
  );
}
