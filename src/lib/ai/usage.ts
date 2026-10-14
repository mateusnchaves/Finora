import "server-only";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { Usage } from "./client";

export type AiKind = "summary" | "question";

/** Calls per user per day. Cached answers do not count. */
export const DAILY_LIMITS: Record<AiKind, number> = { question: 20, summary: 5 };

/** Midnight in São Paulo (UTC−3, no daylight saving since 2019) as an instant. */
function startOfDay(today: string) {
  return `${today}T00:00:00-03:00`;
}

export async function remainingToday(kind: AiKind, today: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .gte("created_at", startOfDay(today));
  if (error) throw error;
  return Math.max(DAILY_LIMITS[kind] - (count ?? 0), 0);
}

export async function logRequest(userId: string, kind: AiKind, usage: Usage) {
  const supabase = await createClient();
  await supabase.from("ai_requests").insert({
    user_id: userId,
    kind,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
  });
}

export async function getCachedResult<T>(key: string, day: string): Promise<T | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_results").select("content").eq("key", key).eq("day", day).maybeSingle();
  return (data?.content as T | undefined) ?? null;
}

export async function saveResult(userId: string, key: string, day: string, content: unknown) {
  const supabase = await createClient();
  await supabase
    .from("ai_results")
    .upsert({ user_id: userId, key, day, content: content as NonNullable<Json> }, { onConflict: "user_id,key,day" });
}
