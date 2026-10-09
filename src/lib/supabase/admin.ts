import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Privileged client (secret key, bypasses RLS). Only for writing shared,
 * non-personal data such as the quote cache. Never use it to read or write
 * a user's rows; those go through the per-request client and RLS.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
