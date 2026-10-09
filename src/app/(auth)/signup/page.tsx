import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "../auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-heading-lg text-ink">Criar conta</h1>
      <p className="mt-1 mb-8 text-body text-ink-muted">Leva menos de um minuto.</p>

      <SignupForm />

      <p className="mt-10 text-center text-body text-ink-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
