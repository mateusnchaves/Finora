import { NextResponse, type NextRequest } from "next/server";
import { todayISO } from "@/lib/dates";
import { pushConfigured, runDailyNotifications } from "@/lib/notifications/push";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily notification job, called by Vercel Cron (vercel.json) with the CRON_SECRET bearer
 * token. It is the one place where the secret key reads users' rows: there is no signed-in
 * user in a scheduled job. It only reads, only for users who turned notifications on.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ error: "push not configured" }, { status: 503 });

  // ?dry=1 lists what would be sent, without sending or logging anything.
  const dryRun = request.nextUrl.searchParams.get("dry") === "1";
  const result = await runDailyNotifications(createAdminClient(), todayISO(), { dryRun });
  return NextResponse.json(result);
}
