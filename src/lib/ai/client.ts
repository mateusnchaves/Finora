import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";

/*
 * Google Gemini, free tier. On the free tier Google may use the content sent to improve its
 * products, which the privacy page says. The model is configurable so a newer Flash can be
 * swapped in without a code change.
 */

export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
/** Used when the main model stays overloaded (the free tier returns 503 at peak times). */
export const AI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

/** The assistant is optional: without a key the app hides it and says so. */
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let client: GoogleGenAI | undefined;

/** One client per server instance; reads GEMINI_API_KEY. */
export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // Overload and server errors are usually brief: retry after 1s, 2s and 4s.
    httpOptions: {
      timeout: 60_000,
      retryOptions: { attempts: 4, initialDelay: 1, maxDelay: 8, httpStatusCodes: [500, 502, 503, 504] },
    },
  });
  return client;
}

/** Low thinking: answering from the user's own numbers needs care, not long reasoning. */
export const AI_CONFIG = {
  maxOutputTokens: 4096,
  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
};

/** Zod schema as plain JSON Schema for Gemini (without the `$schema` marker it does not need). */
export function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const result = z.toJSONSchema(schema) as Record<string, unknown>;
  delete result.$schema;
  return result;
}

export type Usage = { inputTokens: number; outputTokens: number };

export function usageOf(response: GenerateContentResponse): Usage {
  const u = response.usageMetadata;
  return {
    inputTokens: (u?.promptTokenCount ?? 0) + (u?.toolUsePromptTokenCount ?? 0),
    outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
  };
}

export function isOverloaded(error: unknown): boolean {
  return error instanceof ApiError && [500, 502, 503, 504].includes(error.status);
}

/** Runs a request on the main model, then once on the fallback model if the main one is overloaded. */
export async function withFallbackModel<T>(request: (model: string) => Promise<T>): Promise<T> {
  try {
    return await request(AI_MODEL);
  } catch (error) {
    if (!isOverloaded(error) || AI_FALLBACK_MODEL === AI_MODEL) throw error;
    return request(AI_FALLBACK_MODEL);
  }
}

/** Text the user can understand for every failure; details go to the error log. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "O assistente atingiu o limite de uso gratuito por agora. Tente de novo mais tarde.";
    if (isOverloaded(error)) return "O serviço de IA está sobrecarregado agora. Tente de novo em alguns minutos.";
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return "O assistente não está configurado corretamente.";
    }
  }
  return "O assistente não conseguiu responder agora. Tente de novo em instantes.";
}
