import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Link inválido" };

export default function AuthErrorPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card>
        <h1 className="font-display text-heading-lg text-ink">Este link não vale mais</h1>
        <p className="mt-2 text-body text-ink-muted">
          O link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha; se a conta ainda não estiver
          confirmada, crie o cadastro de novo para receber outro link.
        </p>
        <Link href="/login" className={buttonClasses("primary", "mt-6")}>
          Ir para o login
        </Link>
      </Card>
    </main>
  );
}
