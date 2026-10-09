import type { Metadata } from "next";
import Link from "next/link";
import { DemoButton, LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-heading-lg text-ink">Entrar</h1>
      <p className="mt-1 mb-8 text-body text-ink-muted">Acompanhe para onde vai o seu dinheiro.</p>

      <LoginForm />

      <div className="my-6 flex items-center gap-3 text-body-sm text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      <DemoButton />

      <p className="mt-10 text-center text-body text-ink-muted">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-semibold text-brand underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </>
  );
}
