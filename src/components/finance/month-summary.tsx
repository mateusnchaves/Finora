"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateSummary, type SummaryState } from "@/app/(app)/insights/actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { MonthSummary as Summary } from "@/lib/ai/summary";

/** The AI summary of a month: today's saved copy if there is one, otherwise a button. */
export function MonthSummary({ month, initial, isDemo }: { month: string; initial: Summary | null; isDemo: boolean }) {
  // With a summary on screen, the button asks for a fresh one.
  const [state, action, pending] = useActionState<SummaryState>(
    (previous) => generateSummary(month, Boolean(previous.summary)),
    { summary: initial ?? undefined },
  );
  const summary = state.summary;

  return (
    <div className="flex flex-col gap-4">
      {summary ? (
        <>
          <p className="font-display text-heading-md text-ink">{summary.headline}</p>
          <ul className="flex flex-col gap-3">
            {summary.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-body text-ink">
                <Icon name="auto_awesome" size={18} className="mt-0.5 shrink-0 text-brand" />
                <span>
                  {insight.text}
                  {insight.href && (
                    <>
                      {" "}
                      <Link href={insight.href} className="font-semibold text-brand underline-offset-4 hover:underline">
                        Ver lançamentos
                      </Link>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-body text-ink-muted">
          O Finora lê os números do mês e escreve o que mudou, para onde foi o dinheiro e o que merece atenção.
        </p>
      )}

      <FormError message={state.error} />

      {!(isDemo && summary) && (
        <form action={action}>
          <Button type="submit" variant={summary ? "secondary" : "primary"} disabled={pending}>
            <Icon name={summary ? "refresh" : "auto_awesome"} size={20} />
            {pending ? "Escrevendo o resumo…" : summary ? "Atualizar resumo" : "Gerar resumo"}
          </Button>
        </form>
      )}
    </div>
  );
}
