import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();
vi.mock("./client", () => ({
  withFallbackModel: (request: (model: string) => unknown) => request("test-model"),
  AI_CONFIG: {},
  gemini: () => ({ models: { generateContent } }),
  jsonSchema: () => ({}),
  usageOf: () => ({ inputTokens: 100, outputTokens: 10 }),
}));

const run = vi.fn(async (input: { start_date: string }) => JSON.stringify({ expenses: 286.4, from: input.start_date }));
vi.mock("./tools", () => ({
  financeTools: (context: { sources: { label: string; href: string }[] }) => {
    context.sources.push({ label: "Despesas em outubro de 2026", href: "/transactions?month=2026-10&type=expense" });
    return [{ name: "find_transactions", description: "", inputSchema: z.object({ start_date: z.string() }), run }];
  },
}));

const { answerQuestion } = await import("./ask");

const context = { today: "2026-10-14", accounts: [], categories: [] };

function toolCall(args: Record<string, unknown>) {
  const call = { id: "call-1", name: "find_transactions", args };
  return { functionCalls: [call], candidates: [{ content: { role: "model", parts: [{ functionCall: call }] } }] };
}

beforeEach(() => {
  generateContent.mockReset();
  run.mockClear();
});

describe("answerQuestion", () => {
  it("runs the requested tool, sends the result back and returns the final text", async () => {
    generateContent
      .mockResolvedValueOnce(toolCall({ start_date: "2026-10-01" }))
      .mockResolvedValueOnce({ functionCalls: undefined, text: "Você gastou R$ 286,40 com delivery." });

    const { answer, usage } = await answerQuestion("Quanto gastei com delivery?", context);

    expect(answer.text).toBe("Você gastou R$ 286,40 com delivery.");
    expect(answer.sources).toHaveLength(1);
    expect(usage).toEqual({ inputTokens: 200, outputTokens: 20 });
    expect(run).toHaveBeenCalledWith({ start_date: "2026-10-01" });

    // Second request: question, the model's call, then the tool result.
    const contents = generateContent.mock.calls[1][0].contents;
    expect(contents).toHaveLength(3);
    expect(contents[2].parts[0].functionResponse).toMatchObject({ id: "call-1", name: "find_transactions" });
    expect(contents[2].parts[0].functionResponse.response.result).toContain("286.4");
  });

  it("returns invalid tool input to the model instead of running the tool", async () => {
    generateContent
      .mockResolvedValueOnce(toolCall({ start_date: 42 }))
      .mockResolvedValueOnce({ functionCalls: undefined, text: "Pronto." });

    await answerQuestion("?", context);

    expect(run).not.toHaveBeenCalled();
    const result = generateContent.mock.calls[1][0].contents[2].parts[0].functionResponse.response.result;
    expect(result).toMatch(/^Erro nos parâmetros/);
  });

  it("gives up politely after too many tool turns", async () => {
    generateContent.mockResolvedValue(toolCall({ start_date: "2026-10-01" }));
    const { answer } = await answerQuestion("?", context);
    expect(generateContent).toHaveBeenCalledTimes(6);
    expect(answer.text).toMatch(/ampla demais/);
  });
});
