import type { Database } from "@/lib/supabase/database.types";

export type FixedIncomeKind = Database["public"]["Enums"]["fixed_income_kind"];
export type FixedIncomeIndex = Database["public"]["Enums"]["fixed_income_index"];

/** Labels and the usual defaults for each kind, used to prefill the form. */
export const FIXED_INCOME_KINDS: Record<
  FixedIncomeKind,
  { label: string; index: FixedIncomeIndex; rate: string; taxExempt: boolean }
> = {
  cdb: { label: "CDB", index: "cdi", rate: "100", taxExempt: false },
  lci_lca: { label: "LCI / LCA", index: "cdi", rate: "90", taxExempt: true },
  tesouro_selic: { label: "Tesouro Selic", index: "selic", rate: "100", taxExempt: false },
  tesouro_prefixado: { label: "Tesouro Prefixado", index: "pre", rate: "12", taxExempt: false },
  tesouro_ipca: { label: "Tesouro IPCA+", index: "ipca", rate: "6", taxExempt: false },
  debenture: { label: "Debênture", index: "ipca", rate: "7", taxExempt: true },
  other: { label: "Outro", index: "cdi", rate: "100", taxExempt: false },
};

export const FIXED_INCOME_INDEXES: Record<FixedIncomeIndex, { label: string; rateLabel: string }> = {
  cdi: { label: "% do CDI (pós-fixado)", rateLabel: "Percentual do CDI" },
  selic: { label: "% da Selic", rateLabel: "Percentual da Selic" },
  pre: { label: "Prefixado", rateLabel: "Taxa ao ano (%)" },
  ipca: { label: "IPCA + taxa", rateLabel: "Taxa acima do IPCA, ao ano (%)" },
};

const percent = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

/** "110% do CDI", "IPCA + 6,2% a.a.", "12,5% a.a." */
export function describeRate(index: FixedIncomeIndex, rate: number): string {
  switch (index) {
    case "cdi":
      return `${percent(rate)}% do CDI`;
    case "selic":
      return `${percent(rate)}% da Selic`;
    case "pre":
      return `${percent(rate)}% a.a. prefixado`;
    case "ipca":
      return `IPCA + ${percent(rate)}% a.a.`;
  }
}
