"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import type { Source } from "@/lib/ai/aggregate";
import { answerQuestion, type Answer } from "@/lib/ai/ask";
import { aiConfigured, aiErrorMessage } from "@/lib/ai/client";
import { findSuggestion } from "@/lib/ai/suggestions";
import { summarizeMonth, type MonthSummary } from "@/lib/ai/summary";
import { DAILY_LIMITS, getCachedResult, logRequest, remainingToday, saveResult } from "@/lib/ai/usage";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { todayISO } from "@/lib/dates";
import { errorMessage, errorReportingEnabled, sendErrorEvent } from "@/lib/error-reporting";

export type AskEntry = { id: string; question: string; text: string; sources: Source[] };
export type AskState = { entries: AskEntry[]; error?: string };
export type SummaryState = { summary?: MonthSummary; error?: string };

const MAX_ENTRIES = 10;
const QUESTION_LENGTH = { min: 3, max: 300 };

async function report(error: unknown, context: string) {
  console.error(JSON.stringify({ level: "error", message: errorMessage(error), context }));
  if (errorReportingEnabled()) await sendErrorEvent({ source: "server", message: errorMessage(error), context });
}

async function lookups() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return { accounts, categories };
}

/** A typed question, or a suggested one (cached for the day). */
export async function askAssistant(state: AskState, formData: FormData): Promise<AskState> {
  const fail = (error: string): AskState => ({ ...state, error });
  if (!aiConfigured()) return fail("O assistente não está disponível neste momento.");

  const user = await getCurrentUser();
  const suggestion = findSuggestion(String(formData.get("suggestion") ?? ""));
  const typed = String(formData.get("question") ?? "").trim();
  const question = suggestion?.text ?? typed;

  if (!suggestion && user.isDemo) {
    return fail("Na conta demo, escolha uma das perguntas prontas. Crie sua conta para perguntar o que quiser.");
  }
  if (question.length < QUESTION_LENGTH.min) return fail("Escreva a sua pergunta.");
  if (question.length > QUESTION_LENGTH.max) return fail(`Use no máximo ${QUESTION_LENGTH.max} caracteres.`);

  const today = todayISO();
  const cacheKey = suggestion ? `question:${suggestion.id}` : null;
  const append = (answer: Answer): AskState => ({
    entries: [{ id: crypto.randomUUID(), question, ...answer }, ...state.entries].slice(0, MAX_ENTRIES),
  });

  if (cacheKey) {
    const cached = await getCachedResult<Answer>(cacheKey, today);
    if (cached) return append(cached);
  }
  if ((await remainingToday("question", today)) === 0) {
    return fail(`Você já fez ${DAILY_LIMITS.question} perguntas hoje. O limite volta amanhã.`);
  }

  try {
    const { answer, usage } = await answerQuestion(question, { today, ...(await lookups()) });
    await logRequest(user.id, "question", usage);
    if (cacheKey) await saveResult(user.id, cacheKey, today, answer);
    return append(answer);
  } catch (error) {
    await report(error, "askAssistant");
    return fail(aiErrorMessage(error));
  }
}

/** The month summary: today's cached copy, or a new one when `refresh` is set. */
export async function generateSummary(month: string, refresh: boolean): Promise<SummaryState> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Mês inválido." };
  if (!aiConfigured()) return { error: "O assistente não está disponível neste momento." };

  const user = await getCurrentUser();
  const today = todayISO();
  const key = `summary:${month}`;

  const cached = await getCachedResult<MonthSummary>(key, today);
  // The demo is shared: one summary a day is enough for everyone.
  if (cached && (!refresh || user.isDemo)) return { summary: cached };

  if ((await remainingToday("summary", today)) === 0) {
    return { summary: cached ?? undefined, error: `Você já gerou ${DAILY_LIMITS.summary} resumos hoje. Volte amanhã.` };
  }

  try {
    const { summary, usage } = await summarizeMonth(month, today, await lookups());
    await Promise.all([logRequest(user.id, "summary", usage), saveResult(user.id, key, today, summary)]);
    revalidatePath("/insights");
    return { summary };
  } catch (error) {
    await report(error, "generateSummary");
    return { summary: cached ?? undefined, error: aiErrorMessage(error) };
  }
}
