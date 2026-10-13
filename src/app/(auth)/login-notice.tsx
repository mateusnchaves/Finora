"use client";

import { useSearchParams } from "next/navigation";
import { FormError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

/**
 * Messages that arrive through the URL:
 * - /login?confirmed=1 after a confirmation link opened on another device;
 * - /login?error=google when the Google sign-in was cancelled or failed.
 */
export function LoginNotice() {
  const params = useSearchParams();

  if (params.get("error") === "google") {
    return (
      <div className="mb-6">
        <FormError message="Não foi possível entrar com o Google. Tente de novo ou use e-mail e senha." />
      </div>
    );
  }

  if (params.get("confirmed") !== "1") return null;
  return (
    <p role="status" className="mb-6 flex items-start gap-2 rounded-md bg-brand-tint px-3.5 py-3 text-body-sm text-ink">
      <Icon name="mark_email_read" size={18} className="mt-px shrink-0 text-brand" />
      E-mail confirmado. Entre com seu e-mail e senha.
    </p>
  );
}
