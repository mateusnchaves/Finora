import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { computePosition } from "@/lib/investments/position";
import { createClient } from "@/lib/supabase/server";
import { getAccounts } from "./accounts";
import { getInvestmentsOverview } from "./investments-overview";

export type NetWorthPoint = {
  month: string; // yyyy-mm
  accounts: number;
  investments: number;
  total: number;
  /** The current month uses market values; past months use the amount invested (cost). */
  atMarket: boolean;
};

export type NetWorth = {
  total: number;
  accounts: number;
  investments: number;
  history: NetWorthPoint[];
};

/**
 * Accounts + investments today, and how that sum evolved month by month.
 * Past months use account balances at month end plus what was invested at
 * that date (cost), since historical market prices are not stored.
 */
export async function getNetWorth(months = 6): Promise<NetWorth> {
  await getCurrentUser();
  const supabase = await createClient();
  const [accounts, overview, historyResult] = await Promise.all([
    getAccounts(),
    getInvestmentsOverview(),
    supabase.rpc("balance_history", { p_months: months }),
  ]);
  if (historyResult.error) throw historyResult.error;

  const accountsTotal = accounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentsTotal = overview.totals.value;
  const usd = overview.portfolio.usdBrl?.price ?? 0;
  const assets = [...overview.portfolio.holdings, ...overview.portfolio.closed];

  function investedAt(monthEnd: string) {
    let total = 0;
    for (const holding of assets) {
      const trades = holding.trades.filter((t) => t.date <= monthEnd);
      if (trades.length === 0) continue;
      const rate = holding.asset.currency === "USD" ? usd : 1;
      total += computePosition(trades).invested * rate;
    }
    for (const item of overview.fixedIncome.items) {
      if (item.startDate <= monthEnd) total += item.principal;
    }
    return total;
  }

  const history = historyResult.data.map((row, index, all): NetWorthPoint => {
    const month = row.month.slice(0, 7);
    const isLast = index === all.length - 1;
    const accountsAt = Number(row.balance);
    const monthEnd = `${month}-31`;
    const investments = isLast ? investmentsTotal : investedAt(monthEnd);
    return { month, accounts: accountsAt, investments, total: accountsAt + investments, atMarket: isLast };
  });

  return {
    total: accountsTotal + investmentsTotal,
    accounts: accountsTotal,
    investments: investmentsTotal,
    history,
  };
}
