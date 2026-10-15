import "server-only";
import type { Content, FunctionCall, Part } from "@google/genai";
import type { Account, Category } from "@/lib/data/types";
import type { Source } from "./aggregate";
import { CLARA_CHAT_PROMPT } from "./clara";
import { AI_CONFIG, gemini, jsonSchema, usageOf, withFallbackModel, type Usage } from "./client";
import { financeTools, type FinanceTool } from "./tools";

export type Answer = { text: string; sources: Source[] };

/** Earlier turns of the same conversation, oldest first (text only). */
export type ChatTurn = { role: "user" | "clara"; text: string };

/** Model turns per message: a lookup or two, sometimes a comparison, then the answer. */
const MAX_TURNS = 6;

/** Runs one tool call; bad input goes back to the model as an error it can fix. */
async function runTool(tools: FinanceTool[], call: FunctionCall): Promise<string> {
  const tool = tools.find((t) => t.name === call.name);
  if (!tool) return `Erro: a ferramenta ${call.name} não existe.`;
  const input = tool.inputSchema.safeParse(call.args ?? {});
  if (!input.success) return `Erro nos parâmetros: ${input.error.issues.map((i) => i.message).join("; ")}`;
  return tool.run(input.data as never);
}

type QuestionContext = { today: string; accounts: Account[]; categories: Category[] };

export function answerQuestion(
  question: string,
  context: QuestionContext,
  history: ChatTurn[] = [],
): Promise<{ answer: Answer; usage: Usage }> {
  // A request stays on one model: thought signatures belong to the model that wrote them.
  return withFallbackModel((model) => converse(model, question, context, history));
}

async function converse(
  model: string,
  question: string,
  context: QuestionContext,
  history: ChatTurn[],
): Promise<{ answer: Answer; usage: Usage }> {
  const sources: Source[] = [];
  const tools = financeTools({ ...context, sources });
  const declarations = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parametersJsonSchema: jsonSchema(t.inputSchema),
  }));

  // Earlier turns go back as plain text: enough for follow-ups ("e em setembro?"), and the
  // numbers in them came from tools when they were written.
  const contents: Content[] = [
    ...history.map((turn) => ({ role: turn.role === "user" ? "user" : "model", parts: [{ text: turn.text }] })),
    { role: "user", parts: [{ text: `Hoje é ${context.today} (horário de Brasília).\n\n${question}` }] },
  ];
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await gemini().models.generateContent({
      model,
      contents,
      config: { ...AI_CONFIG, systemInstruction: CLARA_CHAT_PROMPT, tools: [{ functionDeclarations: declarations }] },
    });
    const step = usageOf(response);
    usage.inputTokens += step.inputTokens;
    usage.outputTokens += step.outputTokens;

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      const text = response.text?.trim();
      if (!text) break;
      return { answer: { text, sources }, usage };
    }

    // Keep the model's turn as returned (it carries thought signatures), then answer every call.
    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) contents.push(modelTurn);
    const results: Part[] = await Promise.all(
      calls.map(async (call) => ({
        functionResponse: { id: call.id, name: call.name, response: { result: await runTool(tools, call) } },
      })),
    );
    contents.push({ role: "user", parts: results });
  }

  return {
    answer: { text: "Essa ficou ampla demais para eu responder de uma vez. Pode ser mais específico?", sources },
    usage,
  };
}
