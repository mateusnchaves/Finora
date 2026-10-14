"use client";

import { useActionState, useState } from "react";
import { addContribution } from "@/app/(app)/goals/actions";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { initialFormState } from "@/lib/forms";

const DIRECTIONS = [
  { value: "in", label: "Guardar" },
  { value: "out", label: "Retirar" },
] as const;

/** Adds to a goal or takes money back. A successful save clears the form for the next entry. */
export function ContributionForm({ goalId, today }: { goalId: string; today: string }) {
  const [state, action, pending] = useActionState(addContribution.bind(null, goalId), initialFormState);
  const values = { direction: "in", amount: "", date: today, note: "", ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <DirectionPicker initial={values.direction} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Valor"
          name="amount"
          inputMode="decimal"
          placeholder="200,00"
          defaultValue={values.amount}
          error={errors.amount}
        />
        <Field label="Data" name="date" type="date" defaultValue={values.date} error={errors.date} />
      </div>
      <Field
        label="Observação (opcional)"
        name="note"
        maxLength={120}
        placeholder="13º salário, venda do videogame…"
        defaultValue={values.note}
        error={errors.note}
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Registrar"}
      </Button>
    </form>
  );
}

function DirectionPicker({ initial }: { initial: string }) {
  const [direction, setDirection] = useState(initial);
  return (
    <fieldset>
      <legend className="mb-1.5 text-label text-ink-muted">Movimento</legend>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-brand-tint p-1">
        {DIRECTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center rounded-sm text-body font-semibold transition-colors",
              "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              direction === option.value ? "bg-surface-raised text-ink shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name="direction"
              value={option.value}
              checked={direction === option.value}
              onChange={() => setDirection(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
