"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportBrowserError } from "@/components/error-reporter";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

/** Error boundary for the signed-in area: explains, offers a retry, keeps the navigation. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportBrowserError(error, "app error boundary"), [error]);

  return (
    <Card className="flex flex-col items-start gap-3">
      <span className="grid size-12 place-items-center rounded-pill bg-negative-tint text-negative" aria-hidden="true">
        <Icon name="error" size={26} />
      </span>
      <h1 className="font-display text-heading-lg text-ink">Algo deu errado</h1>
      <p className="max-w-md text-body text-ink-muted">
        Não conseguimos carregar esta tela agora. Seus dados estão seguros; tente de novo em instantes.
      </p>
      {error.digest && <p className="text-body-sm text-ink-muted">Código do erro: {error.digest}</p>}
      <div className="mt-2 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Tentar de novo</Button>
        <Link href="/dashboard" className={buttonClasses("ghost")}>
          Ir para a visão geral
        </Link>
      </div>
    </Card>
  );
}
