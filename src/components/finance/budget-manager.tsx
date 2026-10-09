"use client";

import { useActionState, useState } from "react";
import {
  createBudget,
  deleteBudget,
  updateBudget,
  type BudgetActionState,
} from "@/app/(app)/budgets/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import type { Category } from "@/lib/data/types";
import { formatMoneyInput } from "@/lib/format";
import type { ReactNode } from "react";

const inputClasses =
  "min-h-11 w-full min-w-0 rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 text-body text-ink placeholder:text-ink-muted/70";
const initialState: BudgetActionState = {};

/** "Novo orçamento": an expense category without a budget plus a monthly limit. */
export function NewBudgetForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createBudget, initialState);

  if (categories.length === 0) {
    return (
      <Card>
        <CardTitle>Novo orçamento</CardTitle>
        <p className="mt-2 text-body text-ink-muted">Todas as categorias de despesa já têm orçamento.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Novo orçamento</CardTitle>
      <p className="mt-1 text-body-sm text-ink-muted">O limite vale para todos os meses.</p>
      <form key={state.ok ?? 0} action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <label className="relative">
          <span className="sr-only">Categoria</span>
          <select name="categoryId" required className={`${inputClasses} cursor-pointer appearance-none pr-10`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Icon
            name="expand_more"
            size={20}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
          />
        </label>
        <label className="relative">
          <span className="sr-only">Limite mensal</span>
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body text-ink-muted">
            R$
          </span>
          <input name="amount" inputMode="decimal" placeholder="0,00" className={`${inputClasses} tabular pl-10`} />
        </label>
        <Button type="submit" disabled={pending}>
          <Icon name="add" size={20} />
          Adicionar
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-2 text-body-sm text-negative">
          {state.error}
        </p>
      )}
    </Card>
  );
}

/** A budget row: the meter, plus inline edit of the limit and delete. */
export function BudgetRow({
  id,
  name,
  amount,
  children,
}: {
  id: string;
  name: string;
  amount: number;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: BudgetActionState, formData: FormData) => {
    const result = await updateBudget(id, prev, formData);
    if (!result.error) setEditing(false);
    return result;
  }, initialState);

  return (
    <li className="border-b border-border py-4 last:border-b-0">
      {editing ? (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <label htmlFor={`budget-${id}`} className="w-full text-label text-ink-muted">
            Limite mensal de {name}
          </label>
          <div className="relative min-w-40 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body text-ink-muted">
              R$
            </span>
            <input
              id={`budget-${id}`}
              name="amount"
              inputMode="decimal"
              defaultValue={formatMoneyInput(amount)}
              autoFocus
              className={`${inputClasses} tabular pl-10`}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          {state.error && (
            <p role="alert" className="w-full text-body-sm text-negative">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        <>
          {children}
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            <Button variant="quiet" onClick={() => setEditing(true)}>
              <Icon name="edit" size={18} />
              Alterar limite
            </Button>
            <ConfirmButton
              subtle
              label="Excluir"
              confirmLabel="Excluir orçamento"
              action={deleteBudget.bind(null, id)}
            />
          </div>
        </>
      )}
    </li>
  );
}
