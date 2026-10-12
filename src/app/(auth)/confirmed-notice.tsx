"use client";

import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/** Shown on /login?confirmed=1, after a confirmation link opened on another device. */
export function ConfirmedNotice() {
  const params = useSearchParams();
  if (params.get("confirmed") !== "1") return null;
  return (
    <p role="status" className="mb-6 flex items-start gap-2 rounded-md bg-brand-tint px-3.5 py-3 text-body-sm text-ink">
      <Icon name="mark_email_read" size={18} className="mt-px shrink-0 text-brand" />
      E-mail confirmado. Entre com seu e-mail e senha.
    </p>
  );
}
