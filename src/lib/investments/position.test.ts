import { describe, expect, it } from "vitest";
import { computePosition, OversellError, type Trade } from "./position";

let n = 0;
const buy = (date: string, quantity: number, price: number, fees = 0): Trade => ({
  id: String(n++),
  type: "buy",
  date,
  quantity,
  price,
  fees,
});
const sell = (date: string, quantity: number, price: number, fees = 0): Trade => ({
  ...buy(date, quantity, price, fees),
  type: "sell",
});

describe("computePosition", () => {
  it("averages buys, fees included", () => {
    const p = computePosition([buy("2026-01-10", 100, 30, 5), buy("2026-02-10", 100, 40, 5)]);
    expect(p.quantity).toBe(200);
    expect(p.averagePrice).toBeCloseTo(35.05);
    expect(p.invested).toBeCloseTo(7010);
    expect(p.realized).toBe(0);
  });

  it("keeps the average on sales and realizes the difference", () => {
    const p = computePosition([buy("2026-01-10", 100, 30), sell("2026-03-01", 40, 45, 2), buy("2026-04-01", 40, 36)]);
    // After the sale: 60 @ 30. Then +40 @ 36 -> 100 @ 32.40.
    expect(p.quantity).toBe(100);
    expect(p.averagePrice).toBeCloseTo(32.4);
    expect(p.realized).toBeCloseTo(40 * 15 - 2);
  });

  it("orders trades by date, not by input order", () => {
    const p = computePosition([sell("2026-03-01", 10, 50), buy("2026-01-10", 10, 40)]);
    expect(p.quantity).toBe(0);
    expect(p.realized).toBeCloseTo(100);
  });

  it("resets the average after selling everything", () => {
    const p = computePosition([buy("2026-01-10", 10, 40), sell("2026-02-01", 10, 50), buy("2026-03-01", 5, 20)]);
    expect(p.averagePrice).toBeCloseTo(20);
    expect(p.invested).toBeCloseTo(100);
  });

  it("handles fractional crypto quantities", () => {
    const p = computePosition([buy("2026-01-10", 0.015, 340000), sell("2026-05-01", 0.005, 400000)]);
    expect(p.quantity).toBeCloseTo(0.01);
    expect(p.averagePrice).toBeCloseTo(340000);
    expect(p.realized).toBeCloseTo(300);
  });

  it("rejects selling more than held at that date", () => {
    expect(() => computePosition([buy("2026-02-10", 10, 40), sell("2026-01-10", 5, 50)])).toThrow(OversellError);
  });
});
