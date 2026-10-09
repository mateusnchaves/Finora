"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  confirmImport,
  previewImport,
  undoImport,
  type ConfirmResult,
  type ImportPreview,
  type PreviewRow,
  type PreviewState,
} from "@/app/(app)/transactions/import/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FormError, SelectField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Account, Category } from "@/lib/data/types";
import { formatShortDate, formatSignedMoney } from "@/lib/format";

const initialState: PreviewState = {};

export function ImportWizard({ accounts, categories }: { accounts: Account[]; categories: Category[] }) {
  const [state, action, pending] = useActionState(previewImport, initialState);
  const [dismissed, setDismissed] = useState<ImportPreview | null>(null);
  const preview = state.preview && state.preview !== dismissed ? state.preview : null;

  if (preview) {
    return (
      <ReviewStep
        // Remount for every new file so selections start fresh.
        key={`${preview.fileName}-${preview.rows.length}-${preview.accountId}`}
        preview={preview}
        categories={categories}
        onBack={() => setDismissed(preview)}
      />
    );
  }
  return <UploadStep accounts={accounts} action={action} pending={pending} error={state.error} />;
}

function UploadStep({
  accounts,
  action,
  pending,
  error,
}: {
  accounts: Account[];
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const isCard = accounts.find((a) => a.id === accountId)?.type === "credit_card";
  const [fileName, setFileName] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form action={action} className="flex flex-col gap-5">
          <FormError message={error} />
          <SelectField
            label="Conta do extrato"
            name="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>

          <div className="flex flex-col gap-1.5">
            <span className="text-label text-ink-muted">Arquivo</span>
            <label
              className={cn(
                "flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-border-strong bg-surface px-4 py-6 text-center",
                "transition-colors hover:bg-brand-tint/50 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
              )}
            >
              <Icon name="upload_file" size={28} className="text-brand" />
              <span className="text-body font-semibold text-ink">{fileName || "Escolher arquivo OFX ou CSV"}</span>
              <span className="text-body-sm text-ink-muted">Até 900 KB e 500 lançamentos por vez.</span>
              <input
                type="file"
                name="file"
                accept=".ofx,.csv,.txt"
                required
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
            </label>
          </div>

          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              // Card statements list purchases as positive numbers.
              key={isCard ? "card" : "account"}
              type="checkbox"
              name="positiveIsExpense"
              defaultChecked={isCard}
              className="mt-1 size-5 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-body text-ink">Valores positivos são gastos</span>
              <span className="block text-body-sm text-ink-muted">
                Marque para CSV de fatura de cartão, como o do Nubank. Arquivos OFX já informam o sinal.
              </span>
            </span>
          </label>

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Lendo arquivo…" : "Revisar lançamentos"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Como exportar o extrato</CardTitle>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-body text-ink-muted">
          <li>No app ou site do banco, procure “Exportar extrato” e escolha OFX (Money) ou CSV.</li>
          <li>Nada é salvo antes da revisão: você confere categorias e duplicados primeiro.</li>
          <li>
            Quer testar? Baixe o{" "}
            <a href="/samples/extrato-exemplo.ofx" download className="font-semibold text-brand underline-offset-4 hover:underline">
              extrato de exemplo (OFX)
            </a>{" "}
            ou a{" "}
            <a href="/samples/fatura-exemplo.csv" download className="font-semibold text-brand underline-offset-4 hover:underline">
              fatura de exemplo (CSV)
            </a>
            .
          </li>
        </ul>
      </Card>
    </div>
  );
}

type RowState = { include: boolean; categoryId: string | null };

function ReviewStep({
  preview,
  categories,
  onBack,
}: {
  preview: ImportPreview;
  categories: Category[];
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Record<number, RowState>>(() =>
    Object.fromEntries(preview.rows.map((r) => [r.key, { include: r.duplicate === null, categoryId: r.categoryId }])),
  );
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = preview.rows.filter((r) => rows[r.key].include);
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const r of selected) {
      if (r.type === "income") income += r.amount;
      else expenses += r.amount;
    }
    return { income, expenses };
  }, [selected]);
  const duplicates = preview.rows.filter((r) => r.duplicate).length;
  const suggested = preview.rows.filter((r) => r.suggestion).length;

  function update(key: number, change: Partial<RowState>) {
    setRows((current) => ({ ...current, [key]: { ...current[key], ...change } }));
  }

  function submit() {
    startTransition(async () => {
      const response = await confirmImport({
        accountId: preview.accountId,
        rows: selected.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          categoryId: rows[r.key].categoryId,
          externalId: r.externalId,
        })),
      });
      setResult(response);
    });
  }

  if (result?.imported) {
    return <DoneStep result={result} accountName={preview.accountName} onAnother={onBack} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Revise antes de importar</CardTitle>
            <p className="mt-1 text-body-sm text-ink-muted">
              {preview.fileName} · {preview.format.toUpperCase()} · conta {preview.accountName}
            </p>
          </div>
          <Button variant="ghost" onClick={onBack}>
            <Icon name="arrow_back" size={18} />
            Trocar arquivo
          </Button>
        </div>
        <ul className="mt-4 flex flex-col gap-1.5 text-body-sm text-ink-muted">
          <li>
            {preview.rows.length} lançamentos encontrados
            {preview.skipped > 0 && `, ${preview.skipped} linhas ignoradas por estarem incompletas`}.
          </li>
          <li>{suggested} já vêm com categoria sugerida. Confira e ajuste se precisar.</li>
          {duplicates > 0 && (
            <li className="flex items-center gap-1 text-ink">
              <Icon name="error" size={16} />
              {duplicates} {duplicates === 1 ? "parece já estar" : "parecem já estar"} na conta e{" "}
              {duplicates === 1 ? "ficou desmarcado" : "ficaram desmarcados"}.
            </li>
          )}
          {preview.truncated && <li>O arquivo tinha mais de 500 lançamentos; só os primeiros entraram.</li>}
        </ul>
      </Card>

      <Card className="px-4 py-2 sm:px-6">
        <ul>
          {preview.rows.map((row) => (
            <ReviewRow
              key={row.key}
              row={row}
              state={rows[row.key]}
              categories={categories.filter((c) => c.kind === row.type)}
              onChange={(change) => update(row.key, change)}
            />
          ))}
        </ul>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-raised p-4 shadow-card lg:bottom-4">
        <p className="tabular text-body-sm text-ink-muted">
          <span className="font-semibold text-ink">{selected.length}</span> selecionados ·{" "}
          <span className="text-brand">{formatSignedMoney(totals.income, "in")}</span> ·{" "}
          <span className="text-ink">{formatSignedMoney(totals.expenses, "out")}</span>
        </p>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={submit} disabled={pending || selected.length === 0}>
            {pending ? "Importando…" : `Importar ${selected.length} ${selected.length === 1 ? "lançamento" : "lançamentos"}`}
          </Button>
          {result?.error && (
            <p role="alert" className="text-body-sm text-negative">
              {result.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({
  row,
  state,
  categories,
  onChange,
}: {
  row: PreviewRow;
  state: RowState;
  categories: Category[];
  onChange: (change: Partial<RowState>) => void;
}) {
  const isIncome = row.type === "income";
  const id = `import-row-${row.key}`;
  return (
    <li className={cn("border-b border-border py-3 last:border-b-0", !state.include && "opacity-60")}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={state.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--brand)]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={id} className="min-w-0 cursor-pointer truncate text-body font-medium text-ink">
              {row.description}
            </label>
            <span className={cn("tabular shrink-0 text-body font-semibold", isIncome ? "text-brand" : "text-ink")}>
              {formatSignedMoney(row.amount, isIncome ? "in" : "out")}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-body-sm text-ink-muted">{formatShortDate(row.date)}</span>
            <label className="relative">
              <span className="sr-only">Categoria de {row.description}</span>
              <select
                value={state.categoryId ?? ""}
                onChange={(e) => onChange({ categoryId: e.target.value || null })}
                className="min-h-9 cursor-pointer appearance-none rounded-sm border-[1.5px] border-border-strong bg-surface-raised py-1 pr-8 pl-2.5 text-body-sm text-ink"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                size={18}
                className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-ink-muted"
              />
            </label>
            {row.suggestion && state.categoryId === row.categoryId && (
              <span className="text-body-sm text-ink-muted">
                {row.suggestion === "history" ? "como você já classificou antes" : "sugestão automática"}
              </span>
            )}
            {row.duplicate && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-brand-tint px-2.5 py-0.5 text-body-sm font-semibold text-ink">
                <Icon name="error" size={14} />
                {row.duplicate === "same-id" ? "Já importado" : "Possível duplicado"}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function DoneStep({
  result,
  accountName,
  onAnother,
}: {
  result: ConfirmResult;
  accountName: string;
  onAnother: () => void;
}) {
  const [undo, setUndo] = useState<{ removed?: number; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (undo?.removed !== undefined) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <CardTitle>Importação desfeita</CardTitle>
        <p className="text-body text-ink-muted">
          {undo.removed} {undo.removed === 1 ? "lançamento removido" : "lançamentos removidos"} da conta {accountName}.
        </p>
        <Button onClick={onAnother}>Importar outro arquivo</Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-start gap-3">
      <span className="grid size-12 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
        <Icon name="check" size={28} />
      </span>
      <CardTitle>
        {result.imported} {result.imported === 1 ? "lançamento importado" : "lançamentos importados"}
      </CardTitle>
      <p className="text-body text-ink-muted">Eles já aparecem no extrato, nos saldos e no resumo do mês.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Link href={`/transactions?month=${result.month}`} className={buttonClasses("primary")}>
          Ver lançamentos
        </Link>
        <Button variant="secondary" onClick={onAnother}>
          Importar outro arquivo
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(async () => setUndo(await undoImport(result.batchId!)))}
        >
          {pending ? "Desfazendo…" : "Desfazer importação"}
        </Button>
      </div>
      {undo?.error && (
        <p role="alert" className="text-body-sm text-negative">
          {undo.error}
        </p>
      )}
    </Card>
  );
}

