import { describe, expect, it } from "vitest";
import {
  billByDueMonth,
  billForDate,
  billStatus,
  installmentDate,
  parseInstallment,
  paymentWindow,
  splitInstallments,
} from "./credit-card";
import { daysUntil } from "./dates";

// Closes on the 3rd, due on the 10th (same month).
const nubank = { closingDay: 3, dueDay: 10 };
// Closes on the 25th, due on the 5th of the next month.
const itau = { closingDay: 25, dueDay: 5 };

describe("billForDate", () => {
  it("puts a purchase before the closing day in this month's bill", () => {
    expect(billForDate("2026-10-02", nubank)).toEqual({
      month: "2026-10",
      start: "2026-09-03",
      closing: "2026-10-03",
      due: "2026-10-10",
    });
  });

  it("moves a purchase on the closing day to the next bill", () => {
    expect(billForDate("2026-10-03", nubank).month).toBe("2026-11");
    expect(billForDate("2026-10-25", itau)).toEqual({
      month: "2026-12",
      start: "2026-10-25",
      closing: "2026-11-25",
      due: "2026-12-05",
    });
  });

  it("is due the month after closing when the due day comes first", () => {
    expect(billForDate("2026-10-24", itau)).toMatchObject({ closing: "2026-10-25", due: "2026-11-05", month: "2026-11" });
  });

  it("clamps day 31 to short months", () => {
    const card = { closingDay: 31, dueDay: 8 };
    expect(billForDate("2026-02-27", card)).toMatchObject({ closing: "2026-02-28", due: "2026-03-08" });
    expect(billForDate("2026-02-28", card)).toMatchObject({ start: "2026-02-28", closing: "2026-03-31" });
  });

  it("crosses the year", () => {
    expect(billForDate("2026-12-28", itau)).toMatchObject({ closing: "2027-01-25", due: "2027-02-05", month: "2027-02" });
  });

  it("agrees with billByDueMonth", () => {
    for (const date of ["2026-01-01", "2026-03-03", "2026-06-30", "2026-12-31"]) {
      for (const card of [nubank, itau]) {
        const bill = billForDate(date, card);
        expect(billByDueMonth(bill.month, card)).toEqual(bill);
        expect(date >= bill.start && date < bill.closing).toBe(true);
      }
    }
  });
});

describe("paymentWindow", () => {
  it("runs from this closing to the next one", () => {
    expect(paymentWindow(billByDueMonth("2026-10", nubank), nubank)).toEqual({ start: "2026-10-03", end: "2026-11-03" });
  });
});

describe("billStatus", () => {
  const bill = billByDueMonth("2026-10", nubank); // closes 03/10, due 10/10

  it("follows the bill through its life", () => {
    expect(billStatus(bill, "2026-10-01", 500, 0)).toBe("open");
    expect(billStatus(bill, "2026-10-05", 500, 0)).toBe("closed");
    expect(billStatus(bill, "2026-10-10", 500, 0)).toBe("closed");
    expect(billStatus(bill, "2026-10-11", 500, 0)).toBe("overdue");
    expect(billStatus(bill, "2026-10-11", 500, 500)).toBe("paid");
    expect(billStatus(bill, "2026-10-05", 500, 600)).toBe("paid");
  });

  it("treats a partial payment as unpaid", () => {
    expect(billStatus(bill, "2026-10-20", 500, 499.99)).toBe("overdue");
  });

  it("reports bills without purchases as empty", () => {
    expect(billStatus(bill, "2026-10-01", 0, 0)).toBe("empty");
    expect(billStatus(bill, "2026-10-20", -30, 0)).toBe("empty");
  });
});

describe("installments", () => {
  it("splits in cents, the first one absorbing the rounding", () => {
    expect(splitInstallments(100, 3)).toEqual([33.34, 33.33, 33.33]);
    expect(splitInstallments(1800, 12)).toEqual(Array(12).fill(150));
    const parts = splitInstallments(999.99, 7);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(999.99, 2);
  });

  it("charges one per month on the same day, clamped", () => {
    expect(installmentDate("2026-10-15", 1)).toBe("2026-10-15");
    expect(installmentDate("2026-10-15", 4)).toBe("2027-01-15");
    expect(installmentDate("2027-01-31", 2)).toBe("2027-02-28");
  });
});

describe("daysUntil", () => {
  it("counts whole days", () => {
    expect(daysUntil("2026-10-10", "2026-10-07")).toBe(3);
    expect(daysUntil("2026-10-10", "2026-10-10")).toBe(0);
    expect(daysUntil("2026-10-10", "2026-10-12")).toBe(-2);
  });
});

describe("parseInstallment", () => {
  it("reads installments from statement descriptions", () => {
    expect(parseInstallment("Magazine Luiza - Parcela 3/12")).toEqual({ number: 3, count: 12 });
    expect(parseInstallment("AMAZON parcela 1 de 10")).toEqual({ number: 1, count: 10 });
  });

  it("ignores dates and impossible numbers", () => {
    expect(parseInstallment("Compra 03/10")).toBeNull();
    expect(parseInstallment("Parcela 13/12")).toBeNull();
    expect(parseInstallment("Parcela 1/1")).toBeNull();
  });
});
