"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { answerQuestion, type Answer } from "@/lib/ai/ask";
import { aiConfigured, aiErrorMessage } from "@/lib/ai/client";
import { findSuggestion } from "@/lib/ai/suggestions";
import { summarizeMonth, type MonthSummary } from "@/lib/ai/summary";
import { DAILY_LIMITS, getCachedResult, logRequest, remainingToday, saveResult } from "@/lib/ai/usage";
import { getAccounts } from "@/lib/data/accounts";
import { getCategories } from "@/lib/data/categories";
import { monthOf, todayISO } from "@/lib/dates";
import { errorMessage, errorReportingEnabled, sendErrorEvent } from "@/lib/error-reporting";

export type ClaraReply = { answer?: Answer; error?: string };
export type SummaryReply = { summary?: MonthSummary; error?: string };

/** The client sends the conversation so far; it is trimmed and checked here. */
const askSchema = z.object({
  question: z.string().trim().max(500).optional(),
  suggestionId: z.string().max(40).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "clara"]), text: z.string().max(4000) }))
    .max(40)
    .default([]),
});

/** Turns kept as context: enough for follow-ups without resending a long chat every time. */
const HISTORY_TURNS = 12;
const UNAVAILABLE = "A Clara não está disponível neste momento.";

async function report(error: unknown, context: string) {
  console.error(JSON.stringify({ level: "error", message: errorMessage(error), context }));
  if (errorReportingEnabled()) await sendErrorEvent({ source: "server", message: errorMessage(error), context });
}

async function lookups() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  return { accounts, categories };
}

/** One message to Clara, typed or suggested, with the conversation so far. */
export async function askClara(input: z.input<typeof askSchema>): Promise<ClaraReply> {
  if (!aiConfigured()) return { error: UNAVAILABLE };
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return { error: "Mensagem inválida." };

  const user = await getCurrentUser();
  const suggestion = parsed.data.suggestionId ? findSuggestion(parsed.data.suggestionId) : undefined;
  const question = suggestion?.text ?? parsed.data.question ?? "";

  // The demo is shared by everyone: ready-made questions only, each answered on its own.
  if (user.isDemo && !suggestion) {
    return { error: "Na conta demo, escolha uma das perguntas prontas. Crie sua conta para conversar à vontade." };
  }
  if (question.length < 2) return { error: "Escreva a sua mensagem." };

  const history = user.isDemo ? [] : parsed.data.history.slice(-HISTORY_TURNS);
  const today = todayISO();
  // A suggestion opening a conversation has the same answer all day: cache it.
  const cacheKey = suggestion && history.length === 0 ? `question:${suggestion.id}` : null;

  if (cacheKey) {
    const cached = await getCachedResult<Answer>(cacheKey, today);
    if (cached) return { answer: cached };
  }
  if ((await remainingToday("question", today)) === 0) {
    return { error: `Você já mandou ${DAILY_LIMITS.question} mensagens hoje. Amanhã a gente continua.` };
  }

  try {
    const { answer, usage } = await answerQuestion(question, { today, ...(await lookups()) }, history);
    await logRequest(user.id, "question", usage);
    if (cacheKey) await saveResult(user.id, cacheKey, today, answer);
    return { answer };
  } catch (error) {
    await report(error, "askClara");
    return { error: aiErrorMessage(error) };
  }
}

/** This month's summary: today's saved copy, or a new one when `refresh` is set. */
export async function generateSummary(refresh = false): Promise<SummaryReply> {
  if (!aiConfigured()) return { error: UNAVAILABLE };

  const user = await getCurrentUser();
  const today = todayISO();
  const month = monthOf(today);
  const key = `summary:${month}`;

  const cached = await getCachedResult<MonthSummary>(key, today);
  // The demo is shared: one summary a day is enough for everyone.
  if (cached && (!refresh || user.isDemo)) return { summary: cached };

  if ((await remainingToday("summary", today)) === 0) {
    return { summary: cached ?? undefined, error: `Você já pediu ${DAILY_LIMITS.summary} resumos hoje. Volte amanhã.` };
  }

  try {
    const { summary, usage } = await summarizeMonth(month, today, await lookups());
    await Promise.all([logRequest(user.id, "summary", usage), saveResult(user.id, key, today, summary)]);
    return { summary };
  } catch (error) {
    await report(error, "generateSummary");
    return { summary: cached ?? undefined, error: aiErrorMessage(error) };
  }
}
