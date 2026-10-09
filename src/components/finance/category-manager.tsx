"use client";

import { useActionState, useState } from "react";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryActionState,
} from "@/app/(app)/settings/categories/actions";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Icon } from "@/components/ui/icon";
import type { Category, CategoryKind } from "@/lib/data/types";

const inputClasses =
  "min-h-11 w-full min-w-0 rounded-md border-[1.5px] border-border-strong bg-surface-raised px-3.5 text-body text-ink placeholder:text-ink-muted/70";

const initialState: CategoryActionState = {};

export function CategorySection({
  kind,
  title,
  categories,
  usage,
}: {
  kind: CategoryKind;
  title: string;
  categories: Category[];
  usage: Record<string, number>;
}) {
  const [state, action, pending] = useActionState(createCategory.bind(null, kind), initialState);

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ul className="mt-2">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} count={usage[category.id] ?? 0} />
        ))}
      </ul>
      {/* Keyed by successful saves so the input clears after adding. */}
      <form key={state.ok ?? 0} action={action} className="mt-4 flex gap-2">
        <label htmlFor={`new-${kind}`} className="sr-only">
          Nova categoria de {title.toLowerCase()}
        </label>
        <input
          id={`new-${kind}`}
          name="name"
          maxLength={40}
          placeholder="Nova categoria"
          className={inputClasses}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? `new-${kind}-error` : undefined}
        />
        <Button type="submit" variant="secondary" disabled={pending} className="shrink-0">
          <Icon name="add" size={20} />
          Adicionar
        </Button>
      </form>
      {state.error && (
        <p id={`new-${kind}-error`} role="alert" className="mt-2 text-body-sm text-negative">
          {state.error}
        </p>
      )}
    </Card>
  );
}

function CategoryRow({ category, count }: { category: Category; count: number }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: CategoryActionState, formData: FormData) => {
      const result = await renameCategory(category.id, prev, formData);
      if (!result.error) setEditing(false);
      return result;
    },
    initialState,
  );

  if (editing) {
    return (
      <li className="border-b border-border py-3 last:border-b-0">
        <form action={action} className="flex gap-2">
          <label htmlFor={`rename-${category.id}`} className="sr-only">
            Novo nome para {category.name}
          </label>
          <input
            id={`rename-${category.id}`}
            name="name"
            defaultValue={category.name}
            maxLength={40}
            autoFocus
            className={inputClasses}
          />
          <Button type="submit" disabled={pending} className="shrink-0 px-3">
            <Icon name="check" size={20} />
            <span className="sr-only">Salvar nome</span>
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)} className="shrink-0">
            <Icon name="close" size={20} />
            <span className="sr-only">Cancelar</span>
          </Button>
        </form>
        {state.error && (
          <p role="alert" className="mt-2 text-body-sm text-negative">
            {state.error}
          </p>
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-ink">{category.name}</p>
        <p className="text-body-sm text-ink-muted">
          {count === 0 ? "Sem lançamentos" : `${count} ${count === 1 ? "lançamento" : "lançamentos"}`}
        </p>
      </div>
      <Button variant="quiet" onClick={() => setEditing(true)}>
        <Icon name="edit" size={20} />
        <span className="sr-only">Renomear {category.name}</span>
      </Button>
      <ConfirmButton
        subtle
        label="Excluir"
        confirmLabel={count > 0 ? `Excluir (${count} ficam sem categoria)` : "Confirmar exclusão"}
        action={deleteCategory.bind(null, category.id)}
      />
    </li>
  );
}
