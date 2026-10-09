import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card>
        <p className="text-label text-ink-muted">Erro 404</p>
        <h1 className="mt-1 font-display text-heading-lg text-ink">Página não encontrada</h1>
        <p className="mt-2 text-body text-ink-muted">
          O endereço pode estar errado ou o item foi excluído. Volte para a visão geral e siga de lá.
        </p>
        <Link href="/dashboard" className={buttonClasses("primary", "mt-6")}>
          Ir para a visão geral
        </Link>
      </Card>
    </main>
  );
}
