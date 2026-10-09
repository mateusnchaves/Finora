import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  isDemo: boolean;
};

/**
 * Data access layer entry point: verifies the session and returns a narrow
 * user object, or redirects to /login. Deduplicated per request.
 * Call it inside a <Suspense> boundary (it reads cookies).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("name, is_demo").eq("id", claims.sub).single();

  return {
    id: claims.sub,
    email: claims.email ?? "",
    name: profile?.name ?? null,
    isDemo: profile?.is_demo ?? false,
  };
});
