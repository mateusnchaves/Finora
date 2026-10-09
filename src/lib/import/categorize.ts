import { normalizeCategoryName } from "@/lib/category-icons";
import type { Category, CategoryKind } from "@/lib/data/types";

/**
 * Turns a bank description into a stable key: "IFOOD *Restaurante 123 05/10"
 * -> "IFOOD RESTAURANTE". Digits, dates, card numbers and punctuation vary
 * between occurrences of the same merchant, so they are dropped.
 */
export function descriptionKey(description: string): string {
  return description
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\d+/g, " ")
    .replace(/[^A-Z ]+/g, " ")
    .replace(/\b(PIX|TED|DOC|COMPRA|PAGAMENTO|PAG|DEBITO|CREDITO|ENVIADO|RECEBIDO|TRANSF|TRANSFERENCIA)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Built-in hints for common Brazilian merchants, by default category name.
 * The first match wins, so "MERCADO LIVRE" (Compras) is checked before "MERCADO".
 */
const KEYWORD_RULES: { pattern: RegExp; category: string; kind: CategoryKind }[] = [
  { pattern: /\b(AMAZON|MERCADO LIVRE|MERCADOLIVRE|SHOPEE|MAGALU|MAGAZINE|AMERICANAS|SHEIN|RENNER|RIACHUELO|ZARA)\b/, category: "Compras", kind: "expense" },
  { pattern: /\b(IFOOD|RAPPI|RESTAURANTE|LANCHONETE|PADARIA|PIZZARIA|BURGER|MCDONALDS|OUTBACK|CAFE)\b/, category: "Alimentação", kind: "expense" },
  { pattern: /\b(SUPERMERCADO|MERCADO|CARREFOUR|ASSAI|ATACADAO|PAO DE ACUCAR|HORTIFRUTI|SACOLAO)\b/, category: "Alimentação", kind: "expense" },
  { pattern: /\b(UBER|CABIFY|POSTO|SHELL|IPIRANGA|PETROBRAS|COMBUSTIVEL|ESTACIONAMENTO|SEM PARAR|METRO|BILHETE)\b/, category: "Transporte", kind: "expense" },
  { pattern: /\b(NETFLIX|SPOTIFY|DISNEY|HBO|PRIME VIDEO|YOUTUBE|DEEZER|ICLOUD|GOOGLE ONE)\b/, category: "Assinaturas", kind: "expense" },
  { pattern: /\b(FARMACIA|DROGARIA|DROGASIL|RAIA|PANVEL|PACHECO|HOSPITAL|CLINICA|LABORATORIO|SMART FIT|ACADEMIA)\b/, category: "Saúde", kind: "expense" },
  { pattern: /\b(ALUGUEL|CONDOMINIO|ENEL|CEMIG|COPEL|SABESP|COMGAS|INTERNET|ENERGIA)\b/, category: "Moradia", kind: "expense" },
  { pattern: /\b(CINEMA|CINEMARK|INGRESSO|SYMPLA|BAR|STEAM|PLAYSTATION|XBOX)\b/, category: "Lazer", kind: "expense" },
  { pattern: /\b(CURSO|UDEMY|ALURA|ESCOLA|FACULDADE|UNIVERSIDADE|LIVRARIA)\b/, category: "Educação", kind: "expense" },
  { pattern: /\b(SALARIO|FOLHA|PROVENTOS)\b/, category: "Salário", kind: "income" },
  { pattern: /\b(RENDIMENTO|RENDIMENTOS|JUROS|DIVIDENDOS|REMUNERACAO)\b/, category: "Rendimentos", kind: "income" },
];

export type CategoryHistory = Map<string, { categoryId: string; kind: CategoryKind }>;

/**
 * Builds "description key -> category" from the user's own categorized
 * transactions, keeping the most used category per key.
 */
export function buildHistory(
  entries: { description: string; categoryId: string; kind: CategoryKind; count: number }[],
): CategoryHistory {
  const best = new Map<string, { categoryId: string; kind: CategoryKind; count: number }>();
  for (const entry of entries) {
    const key = `${entry.kind}:${descriptionKey(entry.description)}`;
    const current = best.get(key);
    if (!current || entry.count > current.count) best.set(key, entry);
  }
  return new Map([...best].map(([key, { categoryId, kind }]) => [key, { categoryId, kind }]));
}

export type Suggestion = { categoryId: string; source: "history" | "keyword" } | null;

/** Your own past choice wins; then the built-in merchant hints; otherwise no category. */
export function suggestCategory(
  description: string,
  kind: CategoryKind,
  history: CategoryHistory,
  categories: Category[],
): Suggestion {
  const key = descriptionKey(description);
  if (!key) return null;

  const learned = history.get(`${kind}:${key}`);
  if (learned && categories.some((c) => c.id === learned.categoryId)) {
    return { categoryId: learned.categoryId, source: "history" };
  }

  for (const rule of KEYWORD_RULES) {
    if (rule.kind !== kind || !rule.pattern.test(key)) continue;
    const category = categories.find(
      (c) => c.kind === kind && normalizeCategoryName(c.name) === normalizeCategoryName(rule.category),
    );
    if (category) return { categoryId: category.id, source: "keyword" };
  }
  return null;
}
