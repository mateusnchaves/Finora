"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveAccount } from "@/app/(app)/accounts/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField } from "@/components/ui/field";
import { ACCOUNT_TYPE_LABELS, type Account, type AccountType } from "@/lib/data/types";
import { formatMoneyInput } from "@/lib/format";
import { initialFormState } from "@/lib/forms";

const TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

function formatInitialBalance(value: number) {
  return value < 0 ? `-${formatMoneyInput(-value)}` : formatMoneyInput(value);
}

/** The type select, plus closing day, due day and limit when the account is a credit card. */
function CardAwareFields({ values, errors }: { values: Record<string, string>; errors: Record<string, string> }) {
  const [type, setType] = useState(values.type);
  return (
    <>
      <SelectField
        label="Tipo"
        name="type"
        defaultValue={values.type}
        error={errors.type}
        onChange={(event) => setType(event.target.value)}
      >
        {TYPES.map((option) => (
          <option key={option} value={option}>
            {ACCOUNT_TYPE_LABELS[option]}
          </option>
        ))}
      </SelectField>
      {type === "credit_card" && (
        <fieldset className="flex flex-col gap-5 rounded-md bg-brand-tint/50 p-4">
          <legend className="sr-only">Fatura do cartão</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Dia do fechamento"
              name="closingDay"
              inputMode="numeric"
              placeholder="3"
              defaultValue={values.closingDay}
              error={errors.closingDay}
              hint="Compras a partir deste dia vão para a fatura seguinte."
            />
            <Field
              label="Dia do vencimento"
              name="dueDay"
              inputMode="numeric"
              placeholder="10"
              defaultValue={values.dueDay}
              error={errors.dueDay}
            />
          </div>
          <Field
            label="Limite (opcional)"
            name="creditLimit"
            inputMode="decimal"
            placeholder="5.000,00"
            defaultValue={values.creditLimit}
            error={errors.creditLimit}
          />
        </fieldset>
      )}
    </>
  );
}

export function AccountForm({ account }: { account?: Account }) {
  const [state, action, pending] = useActionState(saveAccount, initialFormState);
  const values: Record<string, string> = {
    name: account?.name ?? "",
    type: account?.type ?? "checking",
    initialBalance: account ? formatInitialBalance(account.initialBalance) : "",
    archived: account?.archived ? "on" : "",
    closingDay: account?.closingDay ? String(account.closingDay) : "",
    dueDay: account?.dueDay ? String(account.dueDay) : "",
    creditLimit: account?.creditLimit ? formatMoneyInput(account.creditLimit) : "",
    ...state.values,
  };
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field
        label="Nome"
        name="name"
        maxLength={60}
        placeholder="Nubank, Itaú, Carteira…"
        defaultValue={values.name}
        error={errors.name}
        autoFocus={!account}
      />
      <CardAwareFields values={values} errors={errors} />
      <Field
        label="Saldo inicial"
        name="initialBalance"
        inputMode="decimal"
        placeholder="0,00"
        defaultValue={values.initialBalance}
        error={errors.initialBalance}
        hint="Quanto havia na conta antes do primeiro lançamento. Use “-” para saldo negativo."
      />
      {account && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="archived"
            defaultChecked={values.archived === "on"}
            className="mt-1 size-5 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-body text-ink">Arquivar conta</span>
            <span className="block text-body-sm text-ink-muted">
              Some das listas e dos formulários, mas o histórico continua no extrato.
            </span>
          </span>
        </label>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : account ? "Salvar alterações" : "Adicionar conta"}
        </Button>
        <Link href="/accounts" className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
