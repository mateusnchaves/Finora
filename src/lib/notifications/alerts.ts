/*
 * Which push notifications a user should get today. Pure: the daily job gathers the
 * numbers, this decides. Each alert has a `ref` so it is sent once (see notification_log).
 */
import { daysUntil } from "@/lib/dates";
import { formatMoney, formatShortDate } from "@/lib/format";

export type AlertKind = "bill_due" | "budget_over" | "goal_reached";

export type Alert = { kind: AlertKind; ref: string; title: string; body: string; url: string };

export type AlertInput = {
  today: string;
  month: string;
  /** Last closed bill of each card. */
  bills: { cardId: string; cardName: string; dueMonth: string; due: string; total: number; paid: number }[];
  budgets: { id: string; categoryName: string; limit: number; spent: number }[];
  goals: { id: string; name: string; target: number; saved: number }[];
};

/** A bill is announced from three days before it is due, through the due date. */
export const BILL_NOTICE_DAYS = 3;

export function alertsFor({ today, month, bills, budgets, goals }: AlertInput): Alert[] {
  const alerts: Alert[] = [];

  for (const bill of bills) {
    const remaining = Math.round((bill.total - bill.paid) * 100) / 100;
    const days = daysUntil(bill.due, today);
    if (remaining <= 0 || days < 0 || days > BILL_NOTICE_DAYS) continue;
    const when = days === 0 ? "vence hoje" : days === 1 ? "vence amanhã" : `vence em ${days} dias (${formatShortDate(bill.due)})`;
    alerts.push({
      kind: "bill_due",
      ref: `${bill.cardId}:${bill.due}`,
      title: `Fatura do ${bill.cardName} ${when}`,
      body: `Faltam ${formatMoney(remaining)} para pagar.`,
      url: `/cards/${bill.cardId}?month=${bill.dueMonth}`,
    });
  }

  for (const budget of budgets) {
    if (budget.spent <= budget.limit) continue;
    alerts.push({
      kind: "budget_over",
      ref: `${budget.id}:${month}`,
      title: `Orçamento de ${budget.categoryName} estourado`,
      body: `${formatMoney(budget.spent)} de ${formatMoney(budget.limit)} neste mês.`,
      url: `/budgets`,
    });
  }

  for (const goal of goals) {
    if (goal.saved < goal.target) continue;
    alerts.push({
      kind: "goal_reached",
      ref: goal.id,
      title: `Meta atingida: ${goal.name}`,
      body: `Você juntou ${formatMoney(goal.saved)}. Parabéns pela constância.`,
      url: `/goals/${goal.id}`,
    });
  }

  return alerts;
}
