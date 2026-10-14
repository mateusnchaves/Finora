import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BillStatusBadge } from "@/components/finance/bill-status";
import { MonthSwitcher } from "@/components/finance/month-switcher";
import { TransactionRow } from "@/components/finance/transaction-list";
import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { billForDate } from "@/lib/credit-card";
import { getAccount, getAccounts } from "@/lib/data/accounts";
import { cardSettings, getCardBill } from "@/lib/data/cards";
import { getCategories } from "@/lib/data/categories";
import { parseMonthParam, todayISO } from "@/lib/dates";
import { capitalize, formatMoney, formatMonth, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Fatura" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CardBillPage({ params, searchParams }: PageProps<"/cards/[id]">) {
  return (
    <Suspense fallback={<Card className="h-[560px]" aria-hidden="true" />}>
      <CardBillContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CardBillContent({
  params,
  searchParams,
}: {
  params: PageProps<"/cards/[id]">["params"];
  searchParams: PageProps<"/cards/[id]">["searchParams"];
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  await connection();
  const today = todayISO();
  const card = await getAccount(id);
  if (!card || card.type !== "credit_card") notFound();

  const settings = cardSettings(card);
  const editLink = (
    <Link href={`/accounts/${card.id}/edit`} className={buttonClasses("ghost")}>
      <Icon name="edit" size={20} />
      Editar cartão
    </Link>
  );

  if (!settings) {
    return (
      <>
        <PageHeader title={card.name} action={editLink} />
        <EmptyState
          icon="event"
          title="Informe o fechamento e o vencimento"
          description="Com os dias da fatura, o Finora separa as compras por fatura e avisa quando ela vence."
          action={
            <Link href={`/accounts/${card.id}/edit`} className={buttonClasses("primary")}>
              Configurar cartão
            </Link>
          }
        />
      </>
    );
  }

  const currentMonth = billForDate(today, settings).month;
  const month = parseMonthParam(query.month, `${currentMonth}-01`);
  const [accounts, categories] = await Promise.all([getAccounts({ includeArchived: true }), getCategories()]);
  const { bill, status, total, paid, items, payments } = await getCardBill(card, month, today, {
    accounts,
    categories,
  });
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  // Payments count from the closing date on, so only a closed bill can be paid here.
  const canPay = (status === "closed" || status === "overdue") && remaining > 0;
  const payHref =
    `/transactions/new?type=transfer&to=${card.id}&amount=${remaining.toFixed(2)}` +
    `&description=${encodeURIComponent(`Pagamento da fatura ${card.name}`)}`;

  return (
    <>
      <PageHeader
        title={card.name}
        description={`Fecha dia ${settings.closingDay} · vence dia ${settings.dueDay}`}
        action={editLink}
      />

      <div className="flex flex-col gap-6">
        <MonthSwitcher month={month} hrefFor={(m) => (m === currentMonth ? `/cards/${card.id}` : `/cards/${card.id}?month=${m}`)} />

        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-label text-ink-muted">Fatura de {formatMonth(bill.month)}</p>
            <BillStatusBadge status={status} />
          </div>
          <p className="tabular font-display text-figure-xl text-ink">{formatMoney(Math.max(total, 0))}</p>
          <dl className="grid grid-cols-2 gap-4 text-body-sm sm:grid-cols-3">
            <div>
              <dt className="text-ink-muted">Fechamento</dt>
              <dd className="font-semibold text-ink">{formatShortDate(bill.closing)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Vencimento</dt>
              <dd className={cn("font-semibold", status === "overdue" ? "text-negative" : "text-ink")}>
                {formatShortDate(bill.due)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Pago</dt>
              <dd className="tabular font-semibold text-ink">{formatMoney(paid)}</dd>
            </div>
          </dl>
          {canPay && (
            <div className="flex flex-wrap items-center gap-3">
              <Link href={payHref} className={buttonClasses("primary")}>
                <Icon name="payments" size={20} />
                Pagar {formatMoney(remaining)}
              </Link>
              <p className="text-body-sm text-ink-muted">
                Cria uma transferência da sua conta para o cartão.
              </p>
            </div>
          )}
        </Card>

        {card.creditLimit !== null && <LimitCard limit={card.creditLimit} owed={Math.max(0, -card.balance)} />}

        <Card className="px-6 py-4">
          <CardTitle className="mb-2">Compras ({items.length})</CardTitle>
          {items.length === 0 ? (
            <p className="py-6 text-body text-ink-muted">Nenhuma compra nesta fatura.</p>
          ) : (
            <ul>
              {items.map((t) => (
                <TransactionRow key={t.id} transaction={t} href={`/transactions/${t.id}/edit`} />
              ))}
            </ul>
          )}
        </Card>

        {payments.length > 0 && (
          <Card className="px-6 py-4">
            <CardTitle className="mb-2">Pagamentos</CardTitle>
            <ul>
              {payments.map((t) => (
                <TransactionRow key={t.id} transaction={t} href={`/transactions/${t.id}/edit`} />
              ))}
            </ul>
          </Card>
        )}

        <p className="text-body-sm text-ink-muted">
          {capitalize(formatMonth(bill.month))}: compras de {formatShortDate(bill.start)} até a véspera de{" "}
          {formatShortDate(bill.closing)}. Pagamentos feitos depois do fechamento contam para esta fatura.
        </p>
      </div>
    </>
  );
}

function LimitCard({ limit, owed }: { limit: number; owed: number }) {
  const available = limit - owed;
  const ratio = Math.min(Math.max(owed / limit, 0), 1);
  const over = available < 0;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>Limite</CardTitle>
        <p className="tabular text-body-sm text-ink-muted">
          <span className="font-semibold text-ink">{formatMoney(owed)}</span> usados de {formatMoney(limit)}
        </p>
      </div>
      <div
        role="meter"
        aria-label={`${Math.round(ratio * 100)}% do limite usado`}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("h-2 overflow-hidden rounded-sm", over ? "bg-negative-tint" : "bg-brand-tint")}
      >
        <div className={cn("h-full rounded-sm", over ? "bg-negative" : "bg-brand")} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className={cn("text-body-sm", over ? "text-negative" : "text-ink-muted")}>
        {over
          ? `Limite estourado em ${formatMoney(-available)}`
          : `Disponível: ${formatMoney(available)}. Inclui as parcelas das próximas faturas.`}
      </p>
    </Card>
  );
}
