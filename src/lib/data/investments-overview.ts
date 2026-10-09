import "server-only";
import type { AllocationItem, PortfolioTotals } from "@/components/investments/portfolio";
import { ASSET_CLASS_INFO } from "@/lib/investments/classes";
import { getFixedIncome, type FixedIncomeSummary } from "./fixed-income";
import { getPortfolio, type Portfolio } from "./investments";

export type InvestmentsOverview = {
  portfolio: Portfolio;
  fixedIncome: FixedIncomeSummary;
  totals: PortfolioTotals;
  allocation: AllocationItem[];
  isEmpty: boolean;
};

/** Market assets and fixed income together: totals and allocation in reais. */
export async function getInvestmentsOverview(): Promise<InvestmentsOverview> {
  const [portfolio, fixedIncome] = await Promise.all([getPortfolio(), getFixedIncome()]);

  // Fixed income counts at its gross value; tax is only due on redemption.
  const value = portfolio.totals.value + fixedIncome.totals.gross;
  const invested = portfolio.totals.invested + fixedIncome.totals.principal;

  const allocation: AllocationItem[] = portfolio.allocation.map((a) => ({
    key: a.assetClass,
    label: ASSET_CLASS_INFO[a.assetClass].label,
    icon: ASSET_CLASS_INFO[a.assetClass].icon,
    value: a.value,
  }));
  if (fixedIncome.items.length > 0) {
    allocation.push({ key: "fixed_income", label: "Renda fixa", icon: "savings", value: fixedIncome.totals.gross });
  }

  return {
    portfolio,
    fixedIncome,
    totals: {
      value,
      invested,
      result: value - invested,
      resultPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
      realized: portfolio.totals.realized,
    },
    allocation,
    isEmpty: portfolio.holdings.length === 0 && portfolio.closed.length === 0 && fixedIncome.items.length === 0,
  };
}
