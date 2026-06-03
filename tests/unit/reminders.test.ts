import { describe, it, expect } from "vitest";
import { selectReminders, type LoanForReminder } from "@/lib/reminders";

const NOW = new Date("2026-06-03T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function makeLoan(overrides: Partial<LoanForReminder> = {}): LoanForReminder {
  return {
    id: "loan-1",
    dueAt: new Date(NOW.getTime() + 14 * DAY),
    returnedAt: null,
    reminderSent: false,
    userId: "student-1",
    user: { email: "student@test.dev", name: "Test Student" },
    book: { title: "Test Book" },
    ...overrides,
  };
}

describe("selectReminders", () => {
  it("returns due_soon for a loan due within 2 days", () => {
    const loan = makeLoan({ dueAt: new Date(NOW.getTime() + DAY) });
    const tasks = selectReminders([loan], [], 3, NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].type).toBe("due_soon");
    expect(tasks[0].loanId).toBe("loan-1");
  });

  it("returns overdue for a loan more than 1 day past due", () => {
    const loan = makeLoan({ dueAt: new Date(NOW.getTime() - 2 * DAY) });
    const tasks = selectReminders([loan], [], 3, NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].type).toBe("overdue");
  });

  it("returns no reminder for a loan due 3+ days away", () => {
    const loan = makeLoan({ dueAt: new Date(NOW.getTime() + 3 * DAY) });
    const tasks = selectReminders([loan], [], 3, NOW);
    expect(tasks).toHaveLength(0);
  });

  it("excludes a loan with reminderSent = true", () => {
    const loan = makeLoan({
      dueAt: new Date(NOW.getTime() - 2 * DAY),
      reminderSent: true,
    });
    const tasks = selectReminders([loan], [], 3, NOW);
    expect(tasks).toHaveLength(0);
  });

  it("excludes a loan when that notification type was already sent", () => {
    const loan = makeLoan({ dueAt: new Date(NOW.getTime() - 2 * DAY) });
    const tasks = selectReminders([loan], [{ loanId: "loan-1", type: "overdue" }], 3, NOW);
    expect(tasks).toHaveLength(0);
  });

  it("does not exclude a loan when a different notification type was sent", () => {
    const loan = makeLoan({ dueAt: new Date(NOW.getTime() - 2 * DAY) });
    const tasks = selectReminders([loan], [{ loanId: "loan-1", type: "due_soon" }], 3, NOW);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].type).toBe("overdue");
  });

  it("skips returned loans", () => {
    const loan = makeLoan({
      dueAt: new Date(NOW.getTime() - 2 * DAY),
      returnedAt: new Date(),
    });
    const tasks = selectReminders([loan], [], 3, NOW);
    expect(tasks).toHaveLength(0);
  });

  it("returns over_limit for a student holding more than the max", () => {
    const loans = [1, 2, 3, 4].map((i) =>
      makeLoan({ id: `loan-${i}`, dueAt: new Date(NOW.getTime() + 5 * DAY) })
    );
    const tasks = selectReminders(loans, [], 3, NOW);
    expect(tasks.filter((t) => t.type === "over_limit")).toHaveLength(1);
  });

  it("skips over_limit when already notified for one of the student's loans", () => {
    const loans = [1, 2, 3, 4].map((i) =>
      makeLoan({ id: `loan-${i}`, dueAt: new Date(NOW.getTime() + 5 * DAY) })
    );
    const sent = [{ loanId: "loan-1", type: "over_limit" }];
    const tasks = selectReminders(loans, sent, 3, NOW);
    expect(tasks.filter((t) => t.type === "over_limit")).toHaveLength(0);
  });
});
