import { describe, expect, it } from "vitest";
import { formatDayHeading, formatMoney, formatMoneyInput, formatSignedMoney, parseMoney } from "./format";

const nbsp = (text: string) => text.replace(/ /g, " ");

describe("formatMoney", () => {
  it("uses the Brazilian format", () => {
    expect(nbsp(formatMoney(1836.2))).toBe("R$ 1.836,20");
    expect(nbsp(formatMoney(0))).toBe("R$ 0,00");
  });

  it("puts the minus sign before R$", () => {
    expect(nbsp(formatMoney(-50))).toBe("−R$ 50,00");
  });
});

describe("formatSignedMoney", () => {
  it("adds + for income and − for expenses", () => {
    expect(nbsp(formatSignedMoney(4200, "in"))).toBe("+ R$ 4.200,00");
    expect(nbsp(formatSignedMoney(184.3, "out"))).toBe("− R$ 184,30");
  });
});

describe("parseMoney", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["1234,56", 1234.56],
    ["R$ 1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["39,9", 39.9],
    ["12", 12],
  ])("parses %s", (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "12,345", "-10", "1.23.4"])("rejects %j", (input) => {
    expect(parseMoney(input)).toBeNull();
  });

  it("round-trips formatMoneyInput", () => {
    expect(parseMoney(formatMoneyInput(98765.43))).toBe(98765.43);
  });
});

describe("formatDayHeading", () => {
  it("names today and yesterday", () => {
    expect(formatDayHeading("2026-10-08", "2026-10-08")).toBe("Hoje");
    expect(formatDayHeading("2026-10-07", "2026-10-08")).toBe("Ontem");
    expect(formatDayHeading("2026-09-30", "2026-10-01")).toBe("Ontem");
  });

  it("uses weekday and date for older days", () => {
    expect(formatDayHeading("2026-10-02", "2026-10-08")).toBe("sexta, 2 de outubro");
  });
});
