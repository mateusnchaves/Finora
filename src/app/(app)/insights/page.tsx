import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AssistantChat } from "@/components/finance/assistant-chat";
import { MonthSwitcher } from "@/components/finance/month-switcher";
import { MonthSummary } from "@/components/finance/month-summary";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { aiConfigured } from "@/lib/ai/client";
import type { MonthSummary as Summary } from "@/lib/ai/summary";
import { getCachedResult } from "@/lib/ai/usage";
import { getCurrentUser } from "@/lib/auth";
import { monthOf, parseMonthParam, todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Assistente" };

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <>
      <PageHeader title="Assistente" description="Resumo do mês e respostas sobre o seu dinheiro, com IA." />
      <Suspense fallback={<Card className="h-80" aria-hidden="true" />}>
        <InsightsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function InsightsContent({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  const params = await searchParams;
  await connection();
  const user = await getCurrentUser();

  if (!aiConfigured()) {
    return (
      <EmptyState
        icon="auto_awesome"
        title="Assistente indisponível"
        description="O assistente com IA ainda não foi ativado neste ambiente. O resto do Finora funciona normalmente."
      />
    );
  }

  const today = todayISO();
  const currentMonth = monthOf(today);
  const month = parseMonthParam(params.month, today);
  // Summaries of future months would have nothing to say.
  const shownMonth = month > currentMonth ? currentMonth : month;
  const cached = await getCachedResult<Summary>(`summary:${shownMonth}`, today);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <CardTitle>Resumo do mês</CardTitle>
        <MonthSwitcher
          month={shownMonth}
          hrefFor={(m) => (m === currentMonth || m > currentMonth ? "/insights" : `/insights?month=${m}`)}
        />
        {/* Keyed by month so switching months resets the client state. */}
        <MonthSummary key={shownMonth} month={shownMonth} initial={cached} isDemo={user.isDemo} />
      </Card>

      <Card className="flex flex-col gap-4">
        <CardTitle>Pergunte ao Finora</CardTitle>
        <AssistantChat isDemo={user.isDemo} />
      </Card>

      <p className="text-body-sm text-ink-muted">
        As respostas são escritas por IA (Claude, da Anthropic) a partir dos seus lançamentos, que são
        lidos só quando você pergunta. A IA só consulta seus dados, nunca altera nada. Confira os números pelos links. Veja
        a{" "}
        <Link href="/privacy" className="font-semibold text-brand underline-offset-4 hover:underline">
          política de privacidade
        </Link>
        .
      </p>
    </div>
  );
}
