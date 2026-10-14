/**
 * Sends an error event to Supabase (`public.report_error`). Plain fetch to PostgREST, so it
 * works in every runtime (instrumentation, proxy, Server Actions) without a session.
 * Never throws: reporting must not turn one error into two.
 */
export type ErrorEvent = {
  source: "server" | "client";
  message: string;
  digest?: string;
  path?: string;
  route?: string;
  context?: string;
  userAgent?: string;
};

/** Production on Vercel, or any environment that opts in with REPORT_ERRORS=1. */
export function errorReportingEnabled() {
  return process.env.VERCEL_ENV === "production" || process.env.REPORT_ERRORS === "1";
}

export async function sendErrorEvent(event: ErrorEvent, accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/rpc/report_error`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        // With the user's token, report_error records who hit the error.
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        p_source: event.source,
        p_message: event.message,
        p_digest: event.digest ?? null,
        p_path: event.path ?? null,
        p_route: event.route ?? null,
        p_context: event.context ?? null,
        p_user_agent: event.userAgent ?? null,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Monitoring is best effort.
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export function errorDigest(error: unknown) {
  return typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
}
