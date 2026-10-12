import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE landing point (older confirmation emails). Supabase has already confirmed
 * the address before redirecting here; exchanging the code for a session only works
 * in the browser that signed up. Opened on another device (a phone, say), the
 * exchange fails even though the account is confirmed, so send people to log in
 * instead of showing an error.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");

  // Supabase reports real verification failures (expired or used link) as query params.
  if (params.get("error") || params.get("error_code") || !code) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));

  return NextResponse.redirect(new URL("/login?confirmed=1", request.url));
}
