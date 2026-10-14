"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { askAssistant, type AskEntry, type AskState } from "@/app/(app)/insights/actions";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { SUGGESTED_QUESTIONS } from "@/lib/ai/suggestions";

const initialState: AskState = { entries: [] };

/** Suggested and typed questions; answers stack newest first, each with its sources. */
export function AssistantChat({ isDemo }: { isDemo: boolean }) {
  const [state, action, pending] = useActionState(askAssistant, initialState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <form action={action} className="flex flex-col gap-4">
        <fieldset disabled={pending}>
          <legend className="mb-2 text-label text-ink-muted">Perguntas prontas</legend>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q.id}
                type="submit"
                name="suggestion"
                value={q.id}
                className={cn(
                  "min-h-11 rounded-pill border-[1.5px] border-border-strong px-4 text-left text-body-sm text-ink",
                  "hover:bg-brand-tint disabled:opacity-60",
                )}
              >
                {q.text}
              </button>
            ))}
          </div>
        </fieldset>

        {isDemo ? (
          <p className="text-body-sm text-ink-muted">
            Na conta demo dá para usar as perguntas prontas. Crie sua conta para perguntar o que quiser.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="assistant-question" className="text-label text-ink-muted">
              Ou pergunte com suas palavras
            </label>
            <textarea
              ref={textareaRef}
              id="assistant-question"
              name="question"
              maxLength={300}
              rows={2}
              placeholder="Quanto gastei com Uber em setembro?"
              disabled={pending}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter breaks the line.
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="min-h-20 w-full rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 py-2.5 text-body text-ink placeholder:text-ink-muted/70 focus-visible:border-focus"
            />
            <Button type="submit" disabled={pending} className="mt-2 self-start">
              <Icon name="send" size={20} />
              {pending ? "Pensando…" : "Perguntar"}
            </Button>
          </div>
        )}
      </form>

      <FormError message={state.error} />

      <div aria-live="polite" className="flex flex-col gap-4">
        {pending && (
          <p role="status" className="flex items-center gap-2 text-body-sm text-ink-muted">
            <Icon name="auto_awesome" size={18} className="text-brand" />
            Consultando seus lançamentos…
          </p>
        )}
        {state.entries.map((entry) => (
          <AnswerCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function AnswerCard({ entry }: { entry: AskEntry }) {
  return (
    <article className="rounded-md border border-border p-4">
      <p className="text-body font-semibold text-ink">{entry.question}</p>
      <p className="mt-2 text-body whitespace-pre-line text-ink">{entry.text}</p>
      {entry.sources.length > 0 && (
        <div className="mt-3">
          <p className="text-label text-ink-muted">De onde veio</p>
          <ul className="mt-1 flex flex-col">
            {entry.sources.map((source) => (
              <li key={source.href}>
                <Link
                  href={source.href}
                  className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-brand hover:bg-brand-tint"
                >
                  <Icon name="north_east" size={16} />
                  {source.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
