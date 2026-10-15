"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { pushConfigured, sendPush } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

type Result = { ok: boolean; error?: string };

/** Saves this device's push subscription for the signed-in user. */
export async function savePushSubscription(input: unknown, userAgent: string): Promise<Result> {
  if (!pushConfigured()) return { ok: false, error: "As notificações ainda não estão ativas neste ambiente." };
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Não foi possível ativar neste aparelho." };

  const user = await getCurrentUser();
  if (user.isDemo) return { ok: false, error: "A conta demo é compartilhada, então não recebe notificações." };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: "Não foi possível ativar agora. Tente de novo em instantes." };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<Result> {
  await getCurrentUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint.slice(0, 1000));
  return error ? { ok: false, error: "Não foi possível desativar agora." } : { ok: true };
}

/** A sample notification to the user's own devices, to check that everything works. */
export async function sendTestNotification(): Promise<Result> {
  if (!pushConfigured()) return { ok: false, error: "As notificações ainda não estão ativas neste ambiente." };
  await getCurrentUser();
  const supabase = await createClient();
  const { data: subscriptions } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!subscriptions?.length) return { ok: false, error: "Nenhum aparelho com notificações ativas." };

  const { delivered, gone } = await sendPush(subscriptions, {
    title: "Notificações do Finora ativas",
    body: "Você vai saber quando a fatura estiver perto de vencer, um orçamento estourar ou uma meta for atingida.",
    url: "/settings",
  });
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);
  return delivered > 0 ? { ok: true } : { ok: false, error: "O aviso não chegou. Desative e ative de novo." };
}
