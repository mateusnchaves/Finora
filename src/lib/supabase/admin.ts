import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Privileged client (secret key, bypasses RLS). For writing shared, non-personal data
 * such as the quote cache. The one exception that reads users' rows is the daily
 * notification job (src/app/api/cron/notify), which has no signed-in user; everything
 * else goes through the per-request client and RLS.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
