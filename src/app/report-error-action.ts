"use server";

import { headers } from "next/headers";
import { errorReportingEnabled, sendErrorEvent } from "@/lib/error-reporting";
import { createClient } from "@/lib/supabase/server";

/** Browser errors (error boundaries, window "error" and "unhandledrejection"). */
export async function reportClientError(input: { message: string; path: string; context: string }) {
  if (!errorReportingEnabled()) return;
  if (typeof input?.message !== "string" || !input.message.trim()) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  await sendErrorEvent(
    {
      source: "client",
      message: input.message.slice(0, 1000),
      path: String(input.path ?? "").slice(0, 300),
      context: String(input.context ?? "").slice(0, 200),
      userAgent: (await headers()).get("user-agent") ?? undefined,
    },
    data.session?.access_token,
  );
}
