import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import type { FixedIncomeIndex, FixedIncomeKind } from "@/lib/fixed-income/kinds";
import { getSeries } from "@/lib/fixed-income/rates";
import { valueFixedIncome, type RatePoint, type Valuation } from "@/lib/fixed-income/valuation";
import { createClient } from "@/lib/supabase/server";

export type FixedIncomeItem = {
  id: string;
  name: string;
  kind: FixedIncomeKind;
  index: FixedIncomeIndex;
  rate: number;
  principal: number;
  startDate: string;
  maturityDate: string | null;
  taxExempt: boolean;
  valuation: Valuation;
};

export type FixedIncomeSummary = {
  items: FixedIncomeItem[];
  totals: { principal: number; gross: number; net: number; gain: number };
  /** Last business day with a published CDI, i.e. how current the values are. */
  ratesAsOf: string | null;
};

const COLUMNS = "id, name, kind, index, rate, principal, start_date, maturity_date, tax_exempt";

type Row = {
  id: string;
  name: string;
  kind: FixedIncomeKind;
  index: FixedIncomeIndex;
  rate: number;
  principal: number;
  start_date: string;
  maturity_date: string | null;
  tax_exempt: boolean;
};

async function loadSeriesFor(rows: Row[], today: string) {
  const earliest = (index?: FixedIncomeIndex) =>
    rows
      .filter((r) => !index || r.index === index)
      .map((r) => r.start_date)
      .sort()[0];

  const empty: RatePoint[] = [];
  const firstStart = earliest();
  if (!firstStart) return { cdi: empty, selic: empty, ipca: empty };

  // CDI is always needed: it is also the business-day calendar.
  const [cdi, selic, ipca] = await Promise.all([
    getSeries("cdi", firstStart, today),
    earliest("selic") ? getSeries("selic", earliest("selic")!, today) : empty,
    earliest("ipca") ? getSeries("ipca", earliest("ipca")!, today) : empty,
  ]);
  return { cdi, selic, ipca };
}

function toItem(row: Row, series: { cdi: RatePoint[]; selic: RatePoint[]; ipca: RatePoint[] }, today: string) {
  const terms = {
    index: row.index,
    rate: Number(row.rate),
    principal: Number(row.principal),
    startDate: row.start_date,
    maturityDate: row.maturity_date,
    taxExempt: row.tax_exempt,
  };
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    ...terms,
    valuation: valueFixedIncome(terms, series, today),
  };
}

export async function getFixedIncome(): Promise<FixedIncomeSummary> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("fixed_income").select(COLUMNS).order("start_date");
  if (error) throw error;

  const today = todayISO();
  const series = await loadSeriesFor(data, today);
  const items = data.map((row) => toItem(row, series, today));

  return {
    items,
    totals: {
      principal: items.reduce((sum, i) => sum + i.principal, 0),
      gross: items.reduce((sum, i) => sum + i.valuation.grossValue, 0),
      net: items.reduce((sum, i) => sum + i.valuation.netValue, 0),
      gain: items.reduce((sum, i) => sum + i.valuation.gain, 0),
    },
    ratesAsOf: series.cdi.at(-1)?.date ?? null,
  };
}

export async function getFixedIncomeItem(id: string): Promise<{ item: FixedIncomeItem; ratesAsOf: string | null } | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("fixed_income").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const today = todayISO();
  const series = await loadSeriesFor([data], today);
  return { item: toItem(data, series, today), ratesAsOf: series.cdi.at(-1)?.date ?? null };
}
