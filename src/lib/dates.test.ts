import { describe, expect, it } from "vitest";
import { isISODate, monthRange, parseMonthParam, previousDay, shiftMonth, todayISO } from "./dates";

describe("shiftMonth", () => {
  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
  });
});

describe("monthRange", () => {
  it("returns an exclusive end", () => {
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("parseMonthParam", () => {
  it("accepts yyyy-mm and falls back to the current month", () => {
    expect(parseMonthParam("2026-05", "2026-10-08")).toBe("2026-05");
    expect(parseMonthParam("2026-13", "2026-10-08")).toBe("2026-10");
    expect(parseMonthParam(undefined, "2026-10-08")).toBe("2026-10");
    expect(parseMonthParam(["2026-05"], "2026-10-08")).toBe("2026-10");
  });
});

describe("isISODate", () => {
  it("rejects impossible dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("06/10/2026")).toBe(false);
  });
});

describe("todayISO", () => {
  it("uses the São Paulo calendar day", () => {
    // 02:00 UTC is still the previous evening in São Paulo (UTC−3).
    expect(todayISO(new Date("2026-10-09T02:00:00Z"))).toBe("2026-10-08");
  });
});

describe("previousDay", () => {
  it("handles month starts", () => {
    expect(previousDay("2026-03-01")).toBe("2026-02-28");
  });
});
