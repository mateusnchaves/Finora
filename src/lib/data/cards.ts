import "server-only";
import { getCurrentUser } from "@/lib/auth";
import {
  billByDueMonth,
  billForDate,
  billStatus,
  paymentWindow,
  type BillPeriod,
  type BillStatus,
  type CardSettings,
} from "@/lib/credit-card";
import { shiftMonth } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { nameLookups, toTransactionItem, TRANSACTION_COLUMNS } from "./transactions";
import type { Account, Category, TransactionItem } from "./types";

export type CardBill = {
  bill: BillPeriod;
  status: BillStatus;
  /** Purchases minus refunds in the period. */
  total: number;
  paid: number;
  items: TransactionItem[];
  payments: TransactionItem[];
};

export type CardSummary = {
  card: Account;
  /** The bill receiving today's purchases. */
  current: CardBill;
  /** The last bill that closed, the one to pay now. */
  previous: CardBill;
  /** What is still owed on the card, future installments included. */
  owed: number;
  available: number | null;
};

type Lookups = { accounts: Account[]; categories: Category[] };

export function cardSettings(card: Account): CardSettings | null {
  return card.closingDay && card.dueDay ? { closingDay: card.closingDay, dueDay: card.dueDay } : null;
}

export async function getCardBill(card: Account, dueMonth: string, today: string, lookups: Lookups): Promise<CardBill> {
  const settings = cardSettings(card);
  if (!settings) throw new Error("Card has no closing and due days.");

  await getCurrentUser();
  const supabase = await createClient();
  const bill = billByDueMonth(dueMonth, settings);
  const window = paymentWindow(bill, settings);

  const [purchases, payments] = await Promise.all([
    supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("account_id", card.id)
      .neq("type", "transfer")
      .gte("date", bill.start)
      .lt("date", bill.closing)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select(TRANSACTION_COLUMNS)
      .eq("transfer_account_id", card.id)
      .eq("type", "transfer")
      .gte("date", window.start)
      .lt("date", window.end)
      .order("date", { ascending: false }),
  ]);
  if (purchases.error) throw purchases.error;
  if (payments.error) throw payments.error;

  const names = nameLookups(lookups);
  const items = purchases.data.map((row) => toTransactionItem(row, names));
  const paymentItems = payments.data.map((row) => toTransactionItem(row, names));
  const total = round(items.reduce((sum, t) => sum + (t.type === "expense" ? t.amount : -t.amount), 0));
  const paid = round(paymentItems.reduce((sum, t) => sum + t.amount, 0));

  return { bill, status: billStatus(bill, today, total, paid), total, paid, items, payments: paymentItems };
}

/** Current and last closed bill for every card with closing and due days. */
export async function getCardSummaries(accounts: Account[], today: string, lookups: Lookups): Promise<CardSummary[]> {
  const cards = accounts.filter((a) => a.type === "credit_card" && !a.archived && cardSettings(a));
  return Promise.all(
    cards.map(async (card) => {
      const currentMonth = billForDate(today, cardSettings(card)!).month;
      const [current, previous] = await Promise.all([
        getCardBill(card, currentMonth, today, lookups),
        getCardBill(card, shiftMonth(currentMonth, -1), today, lookups),
      ]);
      const owed = Math.max(0, -card.balance);
      return {
        card,
        current,
        previous,
        owed,
        available: card.creditLimit === null ? null : round(card.creditLimit - owed),
      };
    }),
  );
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
