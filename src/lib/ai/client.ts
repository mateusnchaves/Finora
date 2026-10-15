import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";

/*
 * Google Gemini, free tier. On the free tier Google may use the content sent to improve its
 * products, which the privacy page says. The model is configurable so a newer Flash can be
 * swapped in without a code change.
 */

export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/** The assistant is optional: without a key the app hides it and says so. */
export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

let client: GoogleGenAI | undefined;

/** One client per server instance; reads GEMINI_API_KEY. */
export function gemini(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

/** Text the user can understand for every failure; details go to the error log. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "O assistente atingiu o limite de uso gratuito por agora. Tente de novo mais tarde.";
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return "O assistente não está configurado corretamente.";
    }
  }
  return "O assistente não conseguiu responder agora. Tente de novo em instantes.";
}
