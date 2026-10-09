import { describe, expect, it } from "vitest";
import {
  businessDaysBetween,
  dailyIndexFactor,
  incomeTaxRate,
  ipcaFactor,
  valueFixedIncome,
  type RatePoint,
} from "./valuation";

/** Weekdays between two dates with a constant daily rate. */
function dailySeries(from: string, to: string, value: number): RatePoint[] {
  const points: RatePoint[] = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) points.push({ date: d.toISOString().slice(0, 10), value });
  }
  return points;
}

// 0.05166% per business day ≈ 13.9% a year (252 days).
const cdi = dailySeries("2025-01-01", "2026-12-31", 0.05166);

describe("index factors", () => {
  it("counts business days from the calendar, excluding the end date", () => {
    // 2026-10-05 (Mon) to 2026-10-09 (Fri): Mon..Thu.
    expect(businessDaysBetween(cdi, "2026-10-05", "2026-10-09")).toBe(4);
  });

  it("compounds a percentage of the daily rate", () => {
    const full = dailyIndexFactor(cdi, "2026-10-05", "2026-10-09", 100);
    expect(full).toBeCloseTo(1.0005166 ** 4, 12);
    const partial = dailyIndexFactor(cdi, "2026-10-05", "2026-10-09", 110);
    expect(partial).toBeCloseTo((1 + 0.0005166 * 1.1) ** 4, 12);
  });

  it("accumulates IPCA with the first month pro rata", () => {
    const ipca = [
      { date: "2026-07-01", value: 0.5 },
      { date: "2026-08-01", value: -0.3 },
      { date: "2026-09-01", value: 0.8 },
    ];
    // Starts 16 Jul (16 of 31 days left), full Aug, full Sep; Oct not published.
    const factor = ipcaFactor(ipca, "2026-07-16", "2026-10-09");
    expect(factor).toBeCloseTo(1.005 ** (16 / 31) * 0.997 * 1.008, 10);
  });

  it("uses only the days held when start and end share a month", () => {
    const factor = ipcaFactor([{ date: "2026-09-01", value: 0.9 }], "2026-09-11", "2026-09-21");
    expect(factor).toBeCloseTo(1.009 ** (10 / 30), 10);
  });
});

describe("incomeTaxRate", () => {
  it("follows the regressive table", () => {
    expect(incomeTaxRate(100)).toBe(0.225);
    expect(incomeTaxRate(181)).toBe(0.2);
    expect(incomeTaxRate(361)).toBe(0.175);
    expect(incomeTaxRate(721)).toBe(0.15);
  });
});

describe("valueFixedIncome", () => {
  const series = { cdi, selic: cdi, ipca: [] as RatePoint[] };

  it("values a CDB at 110% of CDI with income tax", () => {
    const v = valueFixedIncome(
      { index: "cdi", rate: 110, principal: 10_000, startDate: "2025-10-09", maturityDate: "2027-10-09", taxExempt: false },
      series,
      "2026-10-09",
    );
    const days = businessDaysBetween(cdi, "2025-10-09", "2026-10-09");
    expect(v.businessDays).toBe(days);
    expect(v.grossValue).toBeCloseTo(10_000 * (1 + 0.0005166 * 1.1) ** days, 6);
    expect(v.taxRate).toBe(0.175); // 365 days held
    expect(v.netValue).toBeCloseTo(v.grossValue - v.gain * 0.175, 6);
    expect(v.matured).toBe(false);
  });

  it("does not tax an exempt LCI", () => {
    const v = valueFixedIncome(
      { index: "cdi", rate: 95, principal: 5_000, startDate: "2026-04-01", maturityDate: null, taxExempt: true },
      series,
      "2026-10-09",
    );
    expect(v.incomeTax).toBe(0);
    expect(v.netValue).toBe(v.grossValue);
  });

  it("values a prefixed bond by business days over 252", () => {
    const v = valueFixedIncome(
      { index: "pre", rate: 12, principal: 1_000, startDate: "2026-01-02", maturityDate: null, taxExempt: false },
      series,
      "2026-10-09",
    );
    expect(v.grossValue).toBeCloseTo(1_000 * 1.12 ** (v.businessDays / 252), 6);
  });

  it("flags a missing index series instead of showing zero gain", () => {
    const v = valueFixedIncome(
      { index: "selic", rate: 100, principal: 1_000, startDate: "2026-01-02", maturityDate: null, taxExempt: false },
      { cdi, selic: [], ipca: [] },
      "2026-10-09",
    );
    expect(v.missingRates).toBe(true);
    expect(v.grossValue).toBe(1_000);
  });

  it("stops at maturity", () => {
    const v = valueFixedIncome(
      { index: "cdi", rate: 100, principal: 1_000, startDate: "2026-01-02", maturityDate: "2026-06-30", taxExempt: false },
      series,
      "2026-10-09",
    );
    expect(v.matured).toBe(true);
    expect(v.valuedAt).toBe("2026-06-30");
    expect(v.businessDays).toBe(businessDaysBetween(cdi, "2026-01-02", "2026-06-30"));
  });
});
