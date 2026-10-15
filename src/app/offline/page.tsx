import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Sem conexão" };

/** Shown by the service worker when a page that was never opened is requested offline. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card className="flex flex-col items-start gap-3">
        <span className="grid size-12 place-items-center rounded-pill bg-brand-tint text-brand" aria-hidden="true">
          <Icon name="cloud_off" size={26} />
        </span>
        <h1 className="font-display text-heading-lg text-ink">Você está sem internet</h1>
        <p className="text-body text-ink-muted">
          As telas que você já abriu continuam disponíveis com os últimos dados vistos. Esta ainda não foi aberta neste
          aparelho. Quando a conexão voltar, é só tentar de novo.
        </p>
      </Card>
    </main>
  );
}
