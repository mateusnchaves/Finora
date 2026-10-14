import { describe, expect, it } from "vitest";
import { goalProgress, monthsUntil } from "./goals";

const trip = { target: 12000, startDate: "2026-01-01", targetDate: "2026-12-31" };

describe("monthsUntil", () => {
  it("counts the current month", () => {
    expect(monthsUntil("2026-12-31", "2026-10-13")).toBe(3);
    expect(monthsUntil("2026-10-31", "2026-10-13")).toBe(1);
    expect(monthsUntil("2027-01-05", "2026-10-13")).toBe(4);
  });

  it("never goes below one", () => {
    expect(monthsUntil("2026-09-30", "2026-10-13")).toBe(1);
  });
});

describe("goalProgress", () => {
  it("is on track when savings follow the straight line", () => {
    const halfway = goalProgress({ ...trip, saved: 6000, today: "2026-07-02" });
    expect(halfway.status).toBe("on_track");
    expect(halfway.ratio).toBe(0.5);
    expect(halfway.remaining).toBe(6000);
    expect(halfway.monthsLeft).toBe(6);
    expect(halfway.monthlyNeeded).toBe(1000);
  });

  it("tolerates being a little behind, not a lot", () => {
    // About R$ 6.000 expected on 2 Jul.
    expect(goalProgress({ ...trip, saved: 5500, today: "2026-07-02" }).status).toBe("on_track");
    expect(goalProgress({ ...trip, saved: 5000, today: "2026-07-02" }).status).toBe("behind");
  });

  it("spreads what is left over the remaining months", () => {
    const late = goalProgress({ ...trip, saved: 3000, today: "2026-10-13" });
    expect(late.status).toBe("behind");
    expect(late.monthsLeft).toBe(3);
    expect(late.monthlyNeeded).toBe(3000);
  });

  it("is done once the target is reached, even past it", () => {
    expect(goalProgress({ ...trip, saved: 12000, today: "2026-05-01" }).status).toBe("done");
    const over = goalProgress({ ...trip, saved: 13000, today: "2027-02-01" });
    expect(over).toMatchObject({ status: "done", ratio: 1, remaining: 0, monthlyNeeded: null });
  });

  it("flags a missed deadline", () => {
    const missed = goalProgress({ ...trip, saved: 9000, today: "2027-01-10" });
    expect(missed).toMatchObject({ status: "overdue", remaining: 3000, monthlyNeeded: 3000 });
  });

  it("has no pace without a deadline", () => {
    const open = goalProgress({ target: 20000, saved: 5000, startDate: "2026-01-01", targetDate: null, today: "2026-10-13" });
    expect(open).toMatchObject({ status: "no_deadline", ratio: 0.25, remaining: 15000, monthlyNeeded: null });
  });

  it("starts on track on day one and never reports negative progress", () => {
    expect(goalProgress({ ...trip, saved: 0, today: "2026-01-01" }).status).toBe("on_track");
    expect(goalProgress({ ...trip, saved: -50, today: "2026-03-01" }).ratio).toBe(0);
  });
});
