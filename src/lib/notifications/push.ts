import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { billForDate } from "@/lib/credit-card";
import { ACCOUNT_COLUMNS, toAccount } from "@/lib/data/accounts";
import { cardSettings, computeCardBill } from "@/lib/data/cards";
import { monthOf, monthRange, shiftMonth } from "@/lib/dates";
import type { Database } from "@/lib/supabase/database.types";
import { alertsFor, type Alert, type AlertInput } from "./alerts";

type Client = SupabaseClient<Database>;
type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string };

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

let configured = false;
function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/**
 * Sends one notification to each subscription. Returns the ids of subscriptions the push
 * service says are gone (404/410), which the caller deletes.
 */
export async function sendPush(subscriptions: Subscription[], payload: PushPayload) {
  configure();
  const gone: string[] = [];
  let delivered = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 },
        );
        delivered += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(sub.id);
      }
    }),
  );
  return { delivered, gone };
}

/** Everything alertsFor needs about one user, read with the server's own client. */
async function gatherInput(admin: Client, userId: string, today: string): Promise<AlertInput> {
  const month = monthOf(today);
  const { start, end } = monthRange(month);

  const [accounts, budgets, expenses, goals] = await Promise.all([
    admin.from("account_balances").select(ACCOUNT_COLUMNS).eq("user_id", userId).eq("archived", false),
    admin.from("budgets").select("id, amount, category_id, categories(name)").eq("user_id", userId),
    admin
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", start)
      .lt("date", end)
      .limit(10000),
    admin.from("goal_progress").select("id, name, target_amount, saved").eq("user_id", userId),
  ]);
  for (const result of [accounts, budgets, expenses, goals]) if (result.error) throw result.error;

  const spentByCategory = new Map<string, number>();
  for (const row of expenses.data ?? []) {
    if (row.category_id) spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + Number(row.amount));
  }

  const cards = (accounts.data ?? []).map(toAccount).filter((a) => a.type === "credit_card" && cardSettings(a));
  const bills = await Promise.all(
    cards.map(async (card) => {
      const dueMonth = shiftMonth(billForDate(today, cardSettings(card)!).month, -1);
      const { bill, total, paid } = await computeCardBill(admin, card, dueMonth, today, { accounts: [], categories: [] });
      return { cardId: card.id, cardName: card.name, dueMonth, due: bill.due, total, paid };
    }),
  );

  return {
    today,
    month,
    bills,
    budgets: (budgets.data ?? []).map((b) => ({
      id: b.id,
      categoryName: (b.categories as { name: string } | null)?.name ?? "categoria",
      limit: Number(b.amount),
      spent: Math.round((spentByCategory.get(b.category_id) ?? 0) * 100) / 100,
    })),
    goals: (goals.data ?? []).map((g) => ({
      id: g.id!,
      name: g.name ?? "",
      target: Number(g.target_amount ?? 0),
      saved: Number(g.saved ?? 0),
    })),
  };
}

/**
 * The daily job. Only users with a device subscribed are read, alerts already sent are
 * skipped, and dead subscriptions are removed.
 */
export async function runDailyNotifications(admin: Client, today: string, { dryRun = false } = {}) {
  const { data: subscriptions, error } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  if (error) throw error;

  const byUser = new Map<string, Subscription[]>();
  for (const sub of subscriptions) byUser.set(sub.user_id, [...(byUser.get(sub.user_id) ?? []), sub]);

  let sent = 0;
  const gone: string[] = [];
  const pending: { kind: string; title: string }[] = [];
  for (const [userId, subs] of byUser) {
    const alerts: Alert[] = alertsFor(await gatherInput(admin, userId, today));
    if (alerts.length === 0) continue;

    const { data: log } = await admin.from("notification_log").select("kind, ref").eq("user_id", userId);
    const seen = new Set((log ?? []).map((l) => `${l.kind}|${l.ref}`));

    for (const alert of alerts.filter((a) => !seen.has(`${a.kind}|${a.ref}`))) {
      if (dryRun) {
        pending.push({ kind: alert.kind, title: alert.title });
        continue;
      }
      const result = await sendPush(subs, { title: alert.title, body: alert.body, url: alert.url });
      gone.push(...result.gone);
      if (result.delivered > 0) {
        sent += 1;
        await admin.from("notification_log").upsert(
          { user_id: userId, kind: alert.kind, ref: alert.ref },
          { onConflict: "user_id,kind,ref", ignoreDuplicates: true },
        );
      }
    }
  }

  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  return dryRun ? { users: byUser.size, pending } : { users: byUser.size, sent, removed: gone.length };
}
