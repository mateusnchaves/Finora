"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  /** Echoed back so the form keeps what the user typed after an error. */
  email?: string;
  name?: string;
  /** Set after sign-up when Supabase requires email confirmation. */
  confirmEmailSentTo?: string;
};

const MIN_PASSWORD_LENGTH = 8;

function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Entre com a sua senha.";
    case "weak_password":
      return `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.";
    default:
      return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
}

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email");
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password) {
    return { error: "Preencha e-mail e senha.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error), email };

  redirect("/dashboard");
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = formData.get("password");

  if (!name || !email || typeof password !== "string") {
    return { error: "Preencha nome, e-mail e senha.", name, email };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use uma senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`, name, email };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: authErrorMessage(error), name, email };

  // With email confirmation turned off, Supabase signs the user in right away.
  if (data.session) redirect("/dashboard");

  return { confirmEmailSentTo: email };
}

export async function signInAsDemo(): Promise<AuthFormState> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) return { error: "A conta demo não está disponível agora." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "A conta demo não está disponível agora." };

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
