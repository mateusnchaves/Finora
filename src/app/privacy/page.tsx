import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Política de privacidade" };

const CONTACT_EMAIL = "mateusnchaves07@gmail.com";

/** Public page linked from Google's consent screen, which requires one to publish the app. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-12">
      <Link href="/login" aria-label="Finora, ir para o login" className="mb-8 self-start">
        <Logo />
      </Link>
      <Card className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-heading-lg text-ink">Política de privacidade</h1>
          <p className="mt-1 text-body-sm text-ink-muted">Atualizada em 13 de outubro de 2026</p>
        </div>

        <p className="text-body text-ink">
          O Finora é um projeto de portfólio para organizar finanças pessoais. Esta página explica quais dados ele
          guarda e o que faz com eles.
        </p>

        <Section title="O que guardamos">
          <li>Nome e e-mail, informados no cadastro ou recebidos do Google quando você entra com a conta Google.</li>
          <li>O que você cadastra no app: contas, lançamentos, orçamentos e investimentos.</li>
        </Section>

        <Section title="Para que usamos">
          <li>Só para entrar na sua conta e mostrar os seus próprios números.</li>
          <li>Não vendemos, não compartilhamos para publicidade e não usamos seus dados para outros fins.</li>
        </Section>

        <Section title="Onde ficam">
          <li>
            No Supabase (banco de dados e login), com regras que impedem um usuário de ler os dados de outro. O site é
            hospedado na Vercel.
          </li>
          <li>
            Para buscar cotações, o app envia aos provedores (brapi, CoinGecko, AwesomeAPI e Banco Central) apenas o
            código do ativo, como PETR4. Nenhum dado pessoal vai junto.
          </li>
        </Section>

        <Section title="Seus direitos">
          <li>
            Você pode pedir a exclusão da sua conta e de todos os seus dados pelo e-mail{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline-offset-4 hover:underline">
              {CONTACT_EMAIL}
            </a>
            . Os dados são apagados de forma definitiva.
          </li>
          <li>A conta demo é compartilhada e volta ao estado original toda noite; não coloque dados reais nela.</li>
        </Section>
      </Card>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-heading-md text-ink">{title}</h2>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-body text-ink">{children}</ul>
    </section>
  );
}
