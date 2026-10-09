"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Destructive action in two steps: the first click asks, the second runs
 * the Server Action. The action may return { error } to show a message.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  action,
}: {
  label: string;
  confirmLabel: string;
  action: () => Promise<{ error?: string } | void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={run} disabled={pending} autoFocus>
            <Icon name="delete" size={20} />
            {pending ? "Excluindo…" : confirmLabel}
          </Button>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <Icon name="delete" size={20} />
          {label}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
