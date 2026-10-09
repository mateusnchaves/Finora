"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveFixedIncome } from "@/app/(app)/investments/fixed-income/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField } from "@/components/ui/field";
import type { FixedIncomeItem } from "@/lib/data/fixed-income";
import {
  FIXED_INCOME_INDEXES,
  FIXED_INCOME_KINDS,
  type FixedIncomeIndex,
  type FixedIncomeKind,
} from "@/lib/fixed-income/kinds";
import { formatMoneyInput } from "@/lib/format";
import { initialFormState } from "@/lib/forms";
import { formatDecimalInput } from "@/lib/investments/numbers";

export function FixedIncomeForm({ item, today }: { item?: FixedIncomeItem; today: string }) {
  const [state, action, pending] = useActionState(saveFixedIncome, initialFormState);
  const values: Record<string, string> = {
    name: item?.name ?? "",
    kind: item?.kind ?? "cdb",
    index: item?.index ?? "cdi",
    rate: item ? formatDecimalInput(item.rate) : FIXED_INCOME_KINDS.cdb.rate,
    principal: item ? formatMoneyInput(item.principal) : "",
    startDate: item?.startDate ?? today,
    maturityDate: item?.maturityDate ?? "",
    taxExempt: item?.taxExempt ? "on" : "",
    ...state.values,
  };

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <Fields values={values} errors={state.fieldErrors ?? {}} isEdit={Boolean(item)} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : item ? "Salvar alterações" : "Adicionar aplicação"}
        </Button>
        <Link href={item ? `/investments/fixed-income/${item.id}` : "/investments"} className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Fields({
  values,
  errors,
  isEdit,
}: {
  values: Record<string, string>;
  errors: Record<string, string>;
  isEdit: boolean;
}) {
  const [kind, setKind] = useState(values.kind as FixedIncomeKind);
  const [index, setIndex] = useState(values.index as FixedIncomeIndex);
  const [rate, setRate] = useState(values.rate);
  const [taxExempt, setTaxExempt] = useState(values.taxExempt === "on");

  // Picking a kind fills in its usual index, rate and tax treatment (new entries only).
  function changeKind(next: FixedIncomeKind) {
    setKind(next);
    if (isEdit) return;
    const defaults = FIXED_INCOME_KINDS[next];
    setIndex(defaults.index);
    setRate(defaults.rate);
    setTaxExempt(defaults.taxExempt);
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          name="kind"
          value={kind}
          onChange={(e) => changeKind(e.target.value as FixedIncomeKind)}
          error={errors.kind}
        >
          {Object.entries(FIXED_INCOME_KINDS).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label}
            </option>
          ))}
        </SelectField>
        <Field
          label="Nome"
          name="name"
          maxLength={80}
          placeholder="CDB Banco Inter 2027"
          defaultValue={values.name}
          error={errors.name}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Rentabilidade"
          name="index"
          value={index}
          onChange={(e) => setIndex(e.target.value as FixedIncomeIndex)}
          error={errors.index}
        >
          {Object.entries(FIXED_INCOME_INDEXES).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label}
            </option>
          ))}
        </SelectField>
        <Field
          label={FIXED_INCOME_INDEXES[index].rateLabel}
          name="rate"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          error={errors.rate}
          hint={index === "cdi" || index === "selic" ? "110 = 110% do índice." : "12,5 = 12,5% ao ano."}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Valor aplicado (R$)"
          name="principal"
          inputMode="decimal"
          placeholder="5.000,00"
          defaultValue={values.principal}
          error={errors.principal}
        />
        <Field label="Data da aplicação" name="startDate" type="date" defaultValue={values.startDate} error={errors.startDate} />
        <Field
          label="Vencimento (opcional)"
          name="maturityDate"
          type="date"
          defaultValue={values.maturityDate}
          error={errors.maturityDate}
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="taxExempt"
          checked={taxExempt}
          onChange={(e) => setTaxExempt(e.target.checked)}
          className="mt-1 size-5 accent-[var(--brand)]"
        />
        <span>
          <span className="block text-body text-ink">Isento de imposto de renda</span>
          <span className="block text-body-sm text-ink-muted">
            LCI, LCA e debêntures incentivadas. Os demais pagam IR pela tabela regressiva (22,5% a 15%).
          </span>
        </span>
      </label>
    </>
  );
}
