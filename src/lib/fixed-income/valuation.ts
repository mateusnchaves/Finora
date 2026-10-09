/*
 * Fixed income valuation from Banco Central series.
 *
 * - CDI / Selic: the principal grows by (1 + daily rate × percentage) on each
 *   business day from the start date up to (not including) the valuation date.
 * - Pré: (1 + annual rate) ^ (business days / 252).
 * - IPCA+: monthly IPCA accumulated since the start (the first month pro rata by
 *   calendar days), times (1 + spread) ^ (business days / 252). Months not yet
 *   published by the IBGE are not counted, so the value trails the real one by
 *   about a month of inflation.
 *
 * Business days come from the CDI series itself: it has one entry per business day.
 */

export type RatePoint = { date: string; value: number }; // value in % (per day or per month)
export type Index = "cdi" | "selic" | "pre" | "ipca";

export type FixedIncomeTerms = {
  index: Index;
  rate: number;
  principal: number;
  startDate: string;
  maturityDate: string | null;
  taxExempt: boolean;
};

export type Valuation = {
  grossValue: number;
  gain: number;
  gainPercent: number;
  /** Income tax on the gain if redeemed at the valuation date (regressive table). */
  incomeTax: number;
  taxRate: number;
  netValue: number;
  businessDays: number;
  /** The date the value refers to (before maturity: today; after: the maturity date). */
  valuedAt: string;
  matured: boolean;
  /** True when the index series is not available for the period, so the value is only the principal. */
  missingRates: boolean;
};

const DAY_MS = 86_400_000;

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Business days in [from, to), counted from the CDI calendar. */
export function businessDaysBetween(calendar: RatePoint[], from: string, to: string): number {
  return calendar.filter((p) => p.date >= from && p.date < to).length;
}

/** Product of (1 + daily% × percentage%) over business days in [from, to). */
export function dailyIndexFactor(series: RatePoint[], from: string, to: string, percentage: number): number {
  let factor = 1;
  for (const point of series) {
    if (point.date >= from && point.date < to) factor *= 1 + (point.value / 100) * (percentage / 100);
  }
  return factor;
}

/** Accumulated monthly IPCA from the start date, first month pro rata. Points are dated yyyy-mm-01. */
export function ipcaFactor(monthly: RatePoint[], from: string, to: string): number {
  const startMonth = from.slice(0, 7);
  const endMonth = to.slice(0, 7);
  let factor = 1;
  for (const point of monthly) {
    const month = point.date.slice(0, 7);
    if (month < startMonth || month > endMonth) continue;
    const [year, m] = month.split("-").map(Number);
    const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const startDay = month === startMonth ? Number(from.slice(8, 10)) : 1;
    const endDay = month === endMonth ? Number(to.slice(8, 10)) : daysInMonth + 1;
    const fraction = (endDay - startDay) / daysInMonth;
    if (fraction <= 0) continue;
    factor *= (1 + point.value / 100) ** fraction;
  }
  return factor;
}

/** Regressive income tax table for fixed income, by calendar days held. */
export function incomeTaxRate(daysHeld: number): number {
  if (daysHeld <= 180) return 0.225;
  if (daysHeld <= 360) return 0.2;
  if (daysHeld <= 720) return 0.175;
  return 0.15;
}

export function valueFixedIncome(
  terms: FixedIncomeTerms,
  series: { cdi: RatePoint[]; selic: RatePoint[]; ipca: RatePoint[] },
  today: string,
): Valuation {
  const matured = terms.maturityDate !== null && terms.maturityDate <= today;
  const valuedAt = matured ? terms.maturityDate! : today;
  const businessDays = businessDaysBetween(series.cdi, terms.startDate, valuedAt);

  let factor: number;
  switch (terms.index) {
    case "cdi":
      factor = dailyIndexFactor(series.cdi, terms.startDate, valuedAt, terms.rate);
      break;
    case "selic":
      factor = dailyIndexFactor(series.selic, terms.startDate, valuedAt, terms.rate);
      break;
    case "pre":
      factor = (1 + terms.rate / 100) ** (businessDays / 252);
      break;
    case "ipca":
      factor = ipcaFactor(series.ipca, terms.startDate, valuedAt) * (1 + terms.rate / 100) ** (businessDays / 252);
      break;
  }

  // Without the index series the factor would silently be 1; say so instead.
  const hasDays = businessDays > 0 || daysBetween(terms.startDate, valuedAt) > 7;
  const missingRates =
    hasDays &&
    ((terms.index === "cdi" && businessDays === 0) ||
      (terms.index === "selic" && !series.selic.some((p) => p.date >= terms.startDate && p.date < valuedAt)) ||
      (terms.index === "ipca" && series.ipca.length === 0 && daysBetween(terms.startDate, valuedAt) > 62) ||
      (terms.index === "pre" && businessDays === 0));

  const grossValue = terms.principal * factor;
  const gain = grossValue - terms.principal;
  const taxRate = terms.taxExempt ? 0 : incomeTaxRate(daysBetween(terms.startDate, valuedAt));
  const incomeTax = Math.max(gain, 0) * taxRate;

  return {
    grossValue,
    gain,
    gainPercent: (gain / terms.principal) * 100,
    incomeTax,
    taxRate,
    netValue: grossValue - incomeTax,
    businessDays,
    valuedAt,
    matured,
    missingRates,
  };
}
