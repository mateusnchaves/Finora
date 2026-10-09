"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTrade } from "@/app/(app)/investments/actions";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, FormError, SelectField } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { Asset } from "@/lib/data/investments";
import { ASSET_CLASSES, ASSET_CLASS_INFO, type AssetClass } from "@/lib/investments/classes";
import { formatDecimalInput } from "@/lib/investments/numbers";
import type { Trade } from "@/lib/investments/position";
import { initialFormState } from "@/lib/forms";

const NEW_ASSET = "new";

type Props = {
  assets: Asset[];
  /** Fixed asset (from the asset page or when editing). */
  asset?: Asset;
  trade?: Trade;
  defaultType?: "buy" | "sell";
  today: string;
  cancelHref: string;
};

export function TradeForm({ assets, asset, trade, defaultType = "buy", today, cancelHref }: Props) {
  const [state, action, pending] = useActionState(saveTrade, initialFormState);
  const values: Record<string, string> = {
    assetId: asset?.id ?? (assets[0]?.id || NEW_ASSET),
    assetClass: "stock_br",
    ticker: "",
    type: trade?.type ?? defaultType,
    quantity: trade ? formatDecimalInput(trade.quantity) : "",
    price: trade ? formatDecimalInput(trade.price, 2) : "",
    fees: trade && trade.fees > 0 ? formatDecimalInput(trade.fees, 2) : "",
    date: trade?.date ?? today,
    ...state.values,
  };
  // After a failed submit, restore the picker (the hidden assetId is empty for a new asset).
  if (!asset && state.values?.assetChoice) values.assetId = state.values.assetChoice;

  return (
    <form key={state.attempt ?? 0} action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      {trade && <input type="hidden" name="tradeId" value={trade.id} />}
      <Fields assets={assets} fixedAsset={asset} values={values} errors={state.fieldErrors ?? {}} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : trade ? "Salvar alterações" : "Registrar operação"}
        </Button>
        <Link href={cancelHref} className={buttonClasses("ghost")}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Fields({
  assets,
  fixedAsset,
  values,
  errors,
}: {
  assets: Asset[];
  fixedAsset?: Asset;
  values: Record<string, string>;
  errors: Record<string, string>;
}) {
  const [type, setType] = useState(values.type);
  const [assetId, setAssetId] = useState(values.assetId);
  const [assetClass, setAssetClass] = useState(values.assetClass as AssetClass);

  const selected = fixedAsset ?? assets.find((a) => a.id === assetId);
  const isNew = !fixedAsset && assetId === NEW_ASSET;
  const currency = isNew ? ASSET_CLASS_INFO[assetClass].currency : (selected?.currency ?? "BRL");
  const symbol = currency === "USD" ? "US$" : "R$";

  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-label text-ink-muted">Operação</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-brand-tint p-1">
          {(["buy", "sell"] as const).map((option) => (
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
              {option === "buy" ? "Compra" : "Venda"}
            </label>
          ))}
        </div>
      </fieldset>

      {fixedAsset ? (
        <div>
          <input type="hidden" name="assetId" value={fixedAsset.id} />
          <p className="text-label text-ink-muted">Ativo</p>
          <p className="mt-1 text-body text-ink">
            <span className="font-semibold">{fixedAsset.ticker}</span> · {fixedAsset.name}
          </p>
        </div>
      ) : (
        <>
          {assets.length > 0 && (
            <SelectField
              label="Ativo"
              name="assetChoice"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              error={errors.assetId}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ticker} · {a.name}
                </option>
              ))}
              <option value={NEW_ASSET}>Outro ativo…</option>
            </SelectField>
          )}
          {isNew && (
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Tipo de ativo"
                name="assetClass"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                error={errors.assetClass}
              >
                {ASSET_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CLASS_INFO[c].label}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Código"
                name="ticker"
                defaultValue={values.ticker}
                placeholder={ASSET_CLASS_INFO[assetClass].example}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={20}
                error={errors.ticker}
              />
            </div>
          )}
          <input type="hidden" name="assetId" value={isNew ? "" : assetId} />
        </>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Quantidade"
          name="quantity"
          inputMode="decimal"
          placeholder={assetClass === "crypto" && isNew ? "0,015" : "100"}
          defaultValue={values.quantity}
          error={errors.quantity}
        />
        <Field
          label={`Preço por unidade (${symbol})`}
          name="price"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={values.price}
          error={errors.price}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Data" name="date" type="date" defaultValue={values.date} error={errors.date} />
        <Field
          label={`Taxas (${symbol}, opcional)`}
          name="fees"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={values.fees}
          error={errors.fees}
          hint="Corretagem e emolumentos. Entram no preço médio."
        />
      </div>
    </>
  );
}
