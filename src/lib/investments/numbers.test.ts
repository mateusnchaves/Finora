import { describe, expect, it } from "vitest";
import { formatDecimalInput, formatPercent, formatPrice, formatQuantity, parseDecimal } from "./numbers";

const nbsp = (text: string) => text.replace(/ /g, " ");

describe("parseDecimal", () => {
  it.each([
    ["0,015", 0.015],
    ["1.234,5678", 1234.5678],
    ["100", 100],
    ["340.42", 340.42],
    ["1.000", 1000],
    ["R$ 36,50", 36.5],
    ["US$ 195,10", 195.1],
    ["0,00000001", 0.00000001],
  ])("reads %s", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "-5", "0,000000001"])("rejects %j", (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats quantities, prices and percents", () => {
    expect(formatQuantity(0.015)).toBe("0,015");
    expect(nbsp(formatQuantity(1500))).toBe("1.500");
    expect(nbsp(formatPrice(340.42, "USD"))).toBe("US$ 340,42");
    expect(nbsp(formatPrice(412516, "BRL"))).toBe("R$ 412.516,00");
    expect(nbsp(formatPrice(0.0123456, "BRL"))).toBe("R$ 0,012346");
    expect(formatPercent(1.234)).toBe("+1,23%");
    expect(formatPercent(-0.5)).toBe("−0,50%");
    expect(formatPercent(0)).toBe("0,00%");
    expect(formatDecimalInput(36.5, 2)).toBe("36,50");
    expect(formatDecimalInput(0.015)).toBe("0,015");
  });
});
