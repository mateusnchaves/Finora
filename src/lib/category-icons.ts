import type { IconName } from "@/components/ui/icon";

/*
 * Icons for the default categories (and common names people create).
 * Matching ignores case and accents; anything unknown falls back to initials.
 */
const ICONS: Record<string, IconName> = {
  alimentacao: "restaurant",
  mercado: "shopping_cart",
  moradia: "home",
  casa: "home",
  transporte: "directions_car",
  saude: "medical_services",
  lazer: "local_activity",
  educacao: "school",
  compras: "shopping_bag",
  assinaturas: "subscriptions",
  pets: "pets",
  viagem: "flight",
  outros: "more_horiz",
  salario: "payments",
  freelance: "work",
  rendimentos: "monitoring",
  "outras receitas": "attach_money",
};

export function normalizeCategoryName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function categoryIcon(name: string | null): IconName | null {
  if (!name) return null;
  return ICONS[normalizeCategoryName(name)] ?? null;
}

/** "Alimentação" -> "AL", "Contas da casa" -> "CD" */
export function categoryInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}
