import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** The assistant is optional: without a key the app hides it and says so. */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;

/** One client per server instance; reads ANTHROPIC_API_KEY. */
export function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

/**
 * Shared request settings. Low effort: answering from the user's own numbers needs care,
 * not long reasoning, and keeps answers fast and cheap. Server-side fallbacks re-run a
 * request on another model if a safety classifier declines it by mistake.
 */
export const AI_REQUEST = {
  model: "claude-opus-5-5",
  max_tokens: 16000,
  output_config: { effort: "low" as const },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
} satisfies Partial<Anthropic.Beta.MessageCreateParamsNonStreaming>;

export type Usage = { inputTokens: number; outputTokens: number };

/** Input tokens include cached ones, so the log reflects the whole prompt. */
export function usageOf(message: Anthropic.Beta.BetaMessage): Usage {
  const u = message.usage;
  return {
    inputTokens: u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    outputTokens: u.output_tokens,
  };
}

/** Text the user can understand for every failure; details go to the error log. */
export function aiErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return "O assistente está ocupado agora. Tente de novo em um minuto.";
  if (error instanceof Anthropic.AuthenticationError) return "O assistente não está configurado corretamente.";
  if (error instanceof Anthropic.APIConnectionError) return "Não foi possível falar com o assistente. Tente de novo.";
  return "O assistente não conseguiu responder agora. Tente de novo em instantes.";
}
