"use client";

import { useEffect } from "react";
import { reportBrowserError } from "@/components/error-reporter";
import "./globals.css";

/** Last-resort boundary: replaces the root layout, so it brings its own document and styles. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportBrowserError(error, "global error boundary"), [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-surface font-sans text-ink">
        <title>Algo deu errado · Finora</title>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-4 py-12">
          <h1 className="text-heading-lg font-semibold">Algo deu errado</h1>
          <p className="text-body text-ink-muted">
            O Finora não conseguiu abrir agora. Seus dados estão seguros; tente de novo em instantes.
          </p>
          {error.digest && <p className="text-body-sm text-ink-muted">Código do erro: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-3 min-h-11 self-start rounded-md bg-brand px-5 text-body font-semibold text-on-brand"
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
