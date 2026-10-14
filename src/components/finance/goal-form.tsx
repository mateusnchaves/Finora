"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveGoal } from "@/app/(app)/goals/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Goal } from "@/lib/data/goals";
import type { Account } from "@/lib/data/types";
import { formatMoneyInput } from "@/lib/format";
import { GOAL_ICONS, type GoalIcon } from "@/lib/goals";
import { initialFormState } from "@/lib/forms";

const ICON_LABELS: Record<GoalIcon, string> = {
  savings: "Cofrinho",
  flight: "Viagem",
  beach_access: "Férias",
  home: "Casa",
  directions_car: "Carro",
  school: "Estudos",
  laptop_mac: "Eletrônicos",
  celebration: "Festa",
  favorite: "Pessoal",
  pets: "Pet",
  flag: "Outro",
};

export function GoalForm({ goal, accounts, minDate }: { goal?: Goal; accounts: Account[]; minDate: string }) {
  const [state, action, pending] = useActionState(saveGoal, initialFormState);
  const values: Record<string, string> = {
    name: goal?.name ?? "",
    icon: goal?.icon ?? "savings",
    targetAmount: goal ? formatMoneyInput(goal.target) : "",
    targetDate: goal?.targetDate ?? "",
    accountId: goal?.accountId ?? "",
    ...state.values,
  };
  const errors = state.fieldErrors ?? {};
  // Money for a goal sits in a bank account, not on a credit card.
  const keepers = accounts.filter((a) => a.type !== "credit_card");

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      {goal && <input type="hidden" name="id" value={goal.id} />}

      <Field
        label="Nome"
        name="name"
        maxLength={60}
        placeholder="Viagem, reserva de emergência…"
        defaultValue={values.name}
        error={errors.name}
        autoFocus={!goal}
      />

      <fieldset>
        <legend className="mb-1.5 text-label text-ink-muted">Ícone</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {GOAL_ICONS.map((icon) => (
            <label
              key={icon}
              className={cn(
                "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md border-[1.5px] border-border text-ink-muted",
                "has-checked:border-brand has-checked:bg-brand-tint has-checked:text-brand",
                "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              )}
            >
              <input type="radio" name="icon" value={icon} defaultChecked={values.icon === icon} className="sr-only" />
              <Icon name={icon} size={22} />
              <span className="text-body-sm">{ICON_LABELS[icon]}</span>
            </label>
          ))}
        </div>
        {errors.icon && <p className="mt-1 text-body-sm text-negative">{errors.icon}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Quanto quer juntar"
          name="targetAmount"
          inputMode="decimal"
          placeholder="5.000,00"
          defaultValue={values.targetAmount}
          error={errors.targetAmount}
        />
        <Field
          label="Até quando (opcional)"
          name="targetDate"
          type="date"
          min={goal ? undefined : minDate}
          defaultValue={values.targetDate}
          error={errors.targetDate}
          hint="Com um prazo, o Finora calcula quanto guardar por mês."
        />
      </div>

      <SelectField
        label="Onde o dinheiro fica (opcional)"
        name="accountId"
        defaultValue={values.accountId}
        error={errors.accountId}
        hint="Só para lembrar: guardar na meta não movimenta a conta."
      >
        <option value="">Não informar</option>
        {keepers.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : goal ? "Salvar alterações" : "Criar meta"}
        </Button>
        <Link href={goal ? `/goals/${goal.id}` : "/goals"} className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
