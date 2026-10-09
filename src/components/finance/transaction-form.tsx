"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTransaction } from "@/app/(app)/transactions/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField, TextareaField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Account, Category, TransactionItem, TransactionType } from "@/lib/data/types";
import { TRANSACTION_TYPE_LABELS } from "@/lib/data/types";
import { formatMoneyInput } from "@/lib/format";
import { initialFormState } from "@/lib/forms";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];

type Props = {
  accounts: Account[];
  categories: Category[];
  transaction?: TransactionItem;
  defaultDate: string;
  cancelHref: string;
};

function initialValues(transaction: TransactionItem | undefined, accounts: Account[], defaultDate: string) {
  if (transaction) {
    return {
      type: transaction.type,
      amount: formatMoneyInput(transaction.amount),
      description: transaction.description,
      date: transaction.date,
      accountId: transaction.accountId,
      transferAccountId: transaction.transferAccountId ?? "",
      categoryId: transaction.categoryId ?? "",
      notes: transaction.notes ?? "",
      repeatMonthly: "",
    };
  }
  return {
    type: "expense",
    amount: "",
    description: "",
    date: defaultDate,
    accountId: accounts[0]?.id ?? "",
    transferAccountId: "",
    categoryId: "",
    notes: "",
    repeatMonthly: "",
  };
}

export function TransactionForm({ accounts, categories, transaction, defaultDate, cancelHref }: Props) {
  const [state, action, pending] = useActionState(saveTransaction, initialFormState);
  const values = { ...initialValues(transaction, accounts, defaultDate), ...state.values };
  const errors = state.fieldErrors ?? {};
  // Keyed by attempt so a failed submit remounts the form with what the user typed.
  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <FormFields
        accounts={accounts}
        categories={categories}
        values={values}
        errors={errors}
        error={state.error}
        isEdit={Boolean(transaction)}
        transactionId={transaction?.id}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : transaction ? "Salvar alterações" : "Adicionar lançamento"}
        </Button>
        <Link href={cancelHref} className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function FormFields({
  accounts,
  categories,
  values,
  errors,
  error,
  isEdit,
  transactionId,
}: {
  accounts: Account[];
  categories: Category[];
  values: Record<string, string>;
  errors: Record<string, string>;
  error?: string;
  isEdit: boolean;
  transactionId?: string;
}) {
  const [type, setType] = useState<TransactionType>(values.type as TransactionType);
  const isTransfer = type === "transfer";
  const kindCategories = categories.filter((c) => c.kind === type);

  return (
    <>
      <FormError message={error} />
      {transactionId && <input type="hidden" name="id" value={transactionId} />}

      <fieldset>
        <legend className="mb-1.5 text-label text-ink-muted">Tipo</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-brand-tint p-1">
          {TYPES.map((option) => (
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
              {TRANSACTION_TYPE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="field-amount" className="text-label text-ink-muted">
          Valor
        </label>
        <div
          className={cn(
            "flex min-h-14 items-center gap-2 rounded-md border-[1.5px] bg-surface-raised px-4",
            "focus-within:border-focus focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus",
            errors.amount ? "border-negative" : "border-border-strong",
          )}
        >
          <span className="text-figure-md text-ink-muted" aria-hidden="true">
            R$
          </span>
          <input
            id="field-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            defaultValue={values.amount}
            autoFocus={!isEdit}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? "field-amount-message" : undefined}
            className="tabular w-full bg-transparent text-figure-md text-ink outline-none placeholder:text-ink-muted/50"
          />
        </div>
        {errors.amount && (
          <p id="field-amount-message" className="flex items-center gap-1 text-body-sm text-negative">
            <Icon name="error" size={16} />
            {errors.amount}
          </p>
        )}
      </div>

      <Field
        label="Descrição"
        name="description"
        maxLength={120}
        placeholder={isTransfer ? "Pagamento da fatura" : type === "income" ? "Salário" : "Mercado"}
        defaultValue={values.description}
        error={errors.description}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Data" name="date" type="date" defaultValue={values.date} error={errors.date} />
        <SelectField
          label={isTransfer ? "Sai da conta" : "Conta"}
          name="accountId"
          defaultValue={values.accountId}
          error={errors.accountId}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
      </div>

      {isTransfer ? (
        <SelectField
          label="Entra na conta"
          name="transferAccountId"
          defaultValue={values.transferAccountId}
          error={errors.transferAccountId}
        >
          <option value="">Escolha a conta de destino</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <SelectField
          // Remount when the type changes so the selection resets to a valid category.
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
      )}

      {!isEdit && !isTransfer && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="repeatMonthly"
            defaultChecked={values.repeatMonthly === "on"}
            className="mt-1 size-5 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-body text-ink">Repetir todo mês</span>
            <span className="block text-body-sm text-ink-muted">
              Lança automaticamente no mesmo dia dos próximos meses, como aluguel ou salário.
            </span>
          </span>
        </label>
      )}

      <TextareaField
        label="Observações (opcional)"
        name="notes"
        maxLength={500}
        defaultValue={values.notes}
        error={errors.notes}
      />
    </>
  );
}
