import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", shortLabel: "Início", icon: "home" },
  { href: "/transactions", label: "Lançamentos", shortLabel: "Lançamentos", icon: "receipt_long" },
  { href: "/accounts", label: "Contas", shortLabel: "Contas", icon: "account_balance_wallet" },
  { href: "/budgets", label: "Orçamentos", shortLabel: "Orçamentos", icon: "donut_large" },
  { href: "/investments", label: "Investimentos", shortLabel: "Investir", icon: "trending_up" },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Configurações",
  shortLabel: "Ajustes",
  icon: "settings",
};
