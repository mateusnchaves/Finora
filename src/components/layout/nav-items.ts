import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  /** Left out of the phone tab bar, which fits six items. */
  desktopOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", shortLabel: "Início", icon: "home" },
  { href: "/transactions", label: "Lançamentos", shortLabel: "Extrato", icon: "receipt_long" },
  { href: "/accounts", label: "Contas", shortLabel: "Contas", icon: "account_balance_wallet" },
  { href: "/budgets", label: "Orçamentos", shortLabel: "Orçamento", icon: "donut_large" },
  { href: "/goals", label: "Metas", shortLabel: "Metas", icon: "flag" },
  { href: "/investments", label: "Investimentos", shortLabel: "Investir", icon: "trending_up" },
  { href: "/insights", label: "Assistente", shortLabel: "Assistente", icon: "auto_awesome", desktopOnly: true },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configurações",
  shortLabel: "Ajustes",
  icon: "settings",
};
