import { describe, expect, it } from "vitest";
import { niceMax } from "./monthly-chart";

describe("niceMax", () => {
  it.each([
    [6125.81, 8000],
    [5000, 5000],
    [4805, 5000],
    [2100, 3000],
    [180, 200],
    [9100, 10000],
    [0, 1000],
  ])("rounds %d up to %d", (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});
