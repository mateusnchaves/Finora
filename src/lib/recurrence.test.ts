import { describe, expect, it } from "vitest";
import { budgetStatus } from "./budget-status";
import { nextOccurrence } from "./recurrence";

const rule = (dayOfMonth: number, startDate = "2026-01-01", endDate: string | null = null) => ({
  dayOfMonth,
  startDate,
  endDate,
});

describe("nextOccurrence", () => {
  it("returns this month's date when it has not passed", () => {
    expect(nextOccurrence(rule(10), "2026-10-08")).toBe("2026-10-10");
  });

  it("includes today", () => {
    expect(nextOccurrence(rule(8), "2026-10-08")).toBe("2026-10-08");
  });

  it("moves to next month once the day passed", () => {
    expect(nextOccurrence(rule(5), "2026-10-08")).toBe("2026-11-05");
  });

  it("clamps day 31 to short months", () => {
    expect(nextOccurrence(rule(31), "2026-09-08")).toBe("2026-09-30");
    expect(nextOccurrence(rule(31), "2026-02-01")).toBe("2026-02-28");
  });

  it("waits for the start date", () => {
    expect(nextOccurrence(rule(5, "2026-12-01"), "2026-10-08")).toBe("2026-12-05");
  });

  it("skips what was already generated today", () => {
    expect(nextOccurrence({ ...rule(8), generatedUntil: "2026-10-08" }, "2026-10-08")).toBe("2026-11-08");
  });

  it("returns null after the end date", () => {
    expect(nextOccurrence(rule(5, "2026-01-01", "2026-10-31"), "2026-10-08")).toBeNull();
  });
});

describe("budgetStatus", () => {
  it("flags near and over the limit", () => {
    expect(budgetStatus(500, 1000)).toBe("ok");
    expect(budgetStatus(800, 1000)).toBe("near");
    expect(budgetStatus(1000, 1000)).toBe("near");
    expect(budgetStatus(1000.01, 1000)).toBe("over");
  });
});
