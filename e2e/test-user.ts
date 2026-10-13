import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/** Throwaway users are created per run with this prefix and removed afterwards. */
export const TEST_EMAIL_PREFIX = "e2e+";
export const TEST_EMAIL_DOMAIN = "@finora.test";
export const CREDENTIALS_FILE = "e2e/.auth/credentials.json";

export type TestCredentials = { id: string; email: string; password: string };

export function readCredentials(): TestCredentials {
  return JSON.parse(readFileSync(CREDENTIALS_FILE, "utf8"));
}

/** Admin client: only for creating and deleting the throwaway test user. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("E2E tests need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function isTestEmail(email: string | undefined) {
  return Boolean(email?.startsWith(TEST_EMAIL_PREFIX) && email.endsWith(TEST_EMAIL_DOMAIN));
}
