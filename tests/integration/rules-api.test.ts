// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { encrypt } from "@/lib/session";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
vi.mock("dotenv/config", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    rules: { findFirst: vi.fn(), update: vi.fn() },
    book: { findUnique: vi.fn(), update: vi.fn() },
    loan: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { PATCH as rulesPatch } from "@/app/api/rules/route";
import { POST as borrowPost } from "@/app/api/loans/route";

async function tokenFor(role: "student" | "librarian" | "manager", userId = `uid-${role}`) {
  return encrypt({ userId, email: `${role}@t.dev`, role });
}

function makeReq(url: string, method: string, body?: object, token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["cookie"] = `library-session=${token}`;
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const fakeRules = (overrides = {}) => ({
  id: 1,
  loanPeriodDays: 14,
  maxBooksPerStudent: 3,
  finePerDay: null,
  updatedAt: new Date(),
  ...overrides,
});

const fakeBook = () => ({
  id: "book-1",
  title: "Test Book",
  author: "Author",
  isbn: null,
  totalCopies: 3,
  availableCopies: 2,
  createdAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.$transaction).mockImplementation(
    async (cb: (tx: typeof db) => Promise<unknown>) => cb(db as unknown as typeof db)
  );
});

// ---- PATCH /api/rules -------------------------------------------------------

describe("PATCH /api/rules", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/rules", {
      method: "PATCH",
      body: JSON.stringify({ loanPeriodDays: 7 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await rulesPatch(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for student", async () => {
    const token = await tokenFor("student");
    const req = makeReq("http://localhost/api/rules", "PATCH", { loanPeriodDays: 7 }, token);
    const res = await rulesPatch(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 for librarian", async () => {
    const token = await tokenFor("librarian");
    const req = makeReq("http://localhost/api/rules", "PATCH", { loanPeriodDays: 7 }, token);
    const res = await rulesPatch(req);
    expect(res.status).toBe(403);
  });

  it("updates the rules row for manager", async () => {
    const token = await tokenFor("manager");
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.rules.update).mockResolvedValueOnce(
      fakeRules({ loanPeriodDays: 7 }) as any
    );

    const req = makeReq("http://localhost/api/rules", "PATCH", { loanPeriodDays: 7 }, token);
    const res = await rulesPatch(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rules.loanPeriodDays).toBe(7);

    expect(vi.mocked(db.rules.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ loanPeriodDays: 7 }),
      })
    );
  });

  it("new loan uses updated loanPeriodDays for dueAt", async () => {
    const token = await tokenFor("student", "student-1");
    vi.mocked(db.book.findUnique).mockResolvedValueOnce(fakeBook() as any);
    // Rules now have loanPeriodDays = 7
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules({ loanPeriodDays: 7 }) as any);
    vi.mocked(db.loan.count).mockResolvedValueOnce(0);
    vi.mocked(db.loan.findFirst).mockResolvedValueOnce(null);
    vi.mocked(db.loan.create).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-1",
      dueAt: new Date(), borrowedAt: new Date(), returnedAt: null, reminderSent: false,
    } as any);
    vi.mocked(db.book.update).mockResolvedValueOnce({} as any);

    const req = makeReq("http://localhost/api/loans", "POST", { bookId: "book-1" }, token);
    const res = await borrowPost(req);
    expect(res.status).toBe(201);

    const createCall = vi.mocked(db.loan.create).mock.calls[0][0];
    const dueAt = (createCall as any).data.dueAt as Date;
    const daysUntilDue = (dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilDue).toBeGreaterThan(6);
    expect(daysUntilDue).toBeLessThan(8);
  });
});
