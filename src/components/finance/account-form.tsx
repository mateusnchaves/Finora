"use client";

import Link from "next/link";
import { useActionState } from "react";
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

export function AccountForm({ account }: { account?: Account }) {
  const [state, action, pending] = useActionState(saveAccount, initialFormState);
  const values: Record<string, string> = {
    name: account?.name ?? "",
    type: account?.type ?? "checking",
    initialBalance: account ? formatInitialBalance(account.initialBalance) : "",
    archived: account?.archived ? "on" : "",
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
      <SelectField label="Tipo" name="type" defaultValue={values.type} error={errors.type}>
        {TYPES.map((type) => (
          <option key={type} value={type}>
            {ACCOUNT_TYPE_LABELS[type]}
          </option>
        ))}
      </SelectField>
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
