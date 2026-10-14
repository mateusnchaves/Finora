/**
 * Ready-made questions. Their answers are cached per user per day, so clicking one again
 * costs nothing, and they are the only questions the shared demo account can ask.
 */
export const SUGGESTED_QUESTIONS = [
  { id: "delivery", text: "Quanto gastei com delivery este mês?" },
  { id: "growth", text: "Qual gasto mais cresceu em relação ao mês passado?" },
  { id: "biggest", text: "Quais foram meus maiores gastos nos últimos 30 dias?" },
  { id: "goals", text: "Como estão minhas metas?" },
] as const;

export type SuggestionId = (typeof SUGGESTED_QUESTIONS)[number]["id"];

export function findSuggestion(id: string) {
  return SUGGESTED_QUESTIONS.find((q) => q.id === id);
}
