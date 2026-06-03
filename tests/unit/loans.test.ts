import { describe, it, expect } from "vitest";
import { canBorrow, isOverdue } from "@/lib/loans";

describe("canBorrow", () => {
  it("returns false when available_copies is 0", () => {
    const result = canBorrow(0, 0, 5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/available/i);
  });

  it("returns false when student is at max_books_per_student", () => {
    const result = canBorrow(3, 3, 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/limit/i);
  });

  it("returns false when student exceeds max_books_per_student", () => {
    const result = canBorrow(5, 4, 3);
    expect(result.ok).toBe(false);
  });

  it("returns true when copies are available and student is under the limit", () => {
    const result = canBorrow(3, 1, 5);
    expect(result.ok).toBe(true);
  });

  it("returns true at exactly one below the max", () => {
    const result = canBorrow(2, 2, 3);
    expect(result.ok).toBe(true);
  });
});

describe("isOverdue", () => {
  it("returns true when dueAt is in the past and loan is not returned", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // yesterday
    expect(isOverdue({ dueAt: pastDate, returnedAt: null })).toBe(true);
  });

  it("returns false when dueAt is in the future", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // tomorrow
    expect(isOverdue({ dueAt: futureDate, returnedAt: null })).toBe(false);
  });

  it("returns false when loan is already returned (even if overdue)", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24);
    expect(isOverdue({ dueAt: pastDate, returnedAt: new Date() })).toBe(false);
  });
});
