"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { signIn, signInAsDemo, signUp, type AuthFormState } from "./actions";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initialState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      <Field label="Senha" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}

export function DemoButton() {
  const [state, action, pending] = useActionState(signInAsDemo, initialState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Abrindo a conta demo…" : "Entrar como demo"}
      </Button>
      <p className="text-center text-body-sm text-ink-muted">
        Conta de exemplo com seis meses de movimentações. Sem cadastro.
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, initialState);

  if (state.confirmEmailSentTo) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-lg bg-brand-tint p-6">
        <Icon name="mark_email_read" size={28} className="text-brand" />
        <h2 className="font-display text-heading-md text-ink">Confirme seu e-mail</h2>
        <p className="text-body text-ink">
          Enviamos um link para <strong className="font-semibold">{state.confirmEmailSentTo}</strong>. Abra o e-mail
          para ativar sua conta.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Field
        label="Nome"
        name="name"
        autoComplete="given-name"
        maxLength={80}
        defaultValue={state.name}
        required
      />
      <Field label="E-mail" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        hint="Pelo menos 8 caracteres."
        required
      />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
