"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveRecurringRule } from "@/app/(app)/transactions/recurring/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Account, Category } from "@/lib/data/types";
import type { RecurringRule } from "@/lib/data/recurring";
import { formatMoneyInput } from "@/lib/format";
import { initialFormState } from "@/lib/forms";

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function RecurringForm({
  rule,
  accounts,
  categories,
  today,
}: {
  rule?: RecurringRule;
  accounts: Account[];
  categories: Category[];
  today: string;
}) {
  const [state, action, pending] = useActionState(saveRecurringRule, initialFormState);
  const values: Record<string, string> = {
    type: rule?.type ?? "expense",
    amount: rule ? formatMoneyInput(rule.amount) : "",
    description: rule?.description ?? "",
    accountId: rule?.accountId ?? accounts[0]?.id ?? "",
    categoryId: rule?.categoryId ?? "",
    dayOfMonth: String(rule?.dayOfMonth ?? Number(today.slice(8, 10))),
    startDate: rule?.startDate ?? today,
    endDate: rule?.endDate ?? "",
    active: rule && !rule.active ? "" : "on",
    ...state.values,
  };

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <Fields rule={rule} accounts={accounts} categories={categories} values={values} state={state} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : rule ? "Salvar alterações" : "Adicionar recorrência"}
        </Button>
        <Link href="/transactions/recurring" className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Fields({
  rule,
  accounts,
  categories,
  values,
  state,
}: {
  rule?: RecurringRule;
  accounts: Account[];
  categories: Category[];
  values: Record<string, string>;
  state: { error?: string; fieldErrors?: Record<string, string> };
}) {
  const [type, setType] = useState(values.type);
  const errors = state.fieldErrors ?? {};
  const kindCategories = categories.filter((c) => c.kind === type);

  return (
    <>
      <FormError message={state.error} />
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <fieldset>
        <legend className="mb-1.5 text-label text-ink-muted">Tipo</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-brand-tint p-1">
          {(["expense", "income"] as const).map((option) => (
            <label
              key={option}
              className={cn(
                "flex min-h-10 cursor-pointer items-center justify-center rounded-sm text-body font-semibold transition-colors",
                "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                type === option ? "bg-surface-raised text-ink shadow-card" : "text-ink-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="type"
                value={option}
                checked={type === option}
                onChange={() => setType(option)}
                className="sr-only"
              />
              {option === "expense" ? "Despesa" : "Receita"}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Descrição"
        name="description"
        maxLength={120}
        placeholder={type === "income" ? "Salário" : "Aluguel"}
        defaultValue={values.description}
        error={errors.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Valor"
          name="amount"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={values.amount}
          error={errors.amount}
        />
        <SelectField label="Todo dia" name="dayOfMonth" defaultValue={values.dayOfMonth} error={errors.dayOfMonth}>
          {DAYS.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </SelectField>
      </div>
      <p className="-mt-3 text-body-sm text-ink-muted">
        Em meses mais curtos, os dias 29, 30 e 31 caem no último dia do mês.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Conta" name="accountId" defaultValue={values.accountId} error={errors.accountId}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          key={type}
          label="Categoria"
          name="categoryId"
          defaultValue={kindCategories.some((c) => c.id === values.categoryId) ? values.categoryId : ""}
          error={errors.categoryId}
        >
          <option value="">Sem categoria</option>
          {kindCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Começa em"
          name="startDate"
          type="date"
          defaultValue={values.startDate}
          error={errors.startDate}
        />
        <Field
          label="Termina em (opcional)"
          name="endDate"
          type="date"
          defaultValue={values.endDate}
          error={errors.endDate}
        />
      </div>

      {rule && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values.active === "on"}
            className="mt-1 size-5 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-body text-ink">Recorrência ativa</span>
            <span className="block text-body-sm text-ink-muted">
              Desmarque para pausar sem perder a configuração.
            </span>
          </span>
        </label>
      )}
      {!rule && <input type="hidden" name="active" value="on" />}
    </>
  );
}
