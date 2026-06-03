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
    book: { findUnique: vi.fn(), update: vi.fn() },
    rules: { findFirst: vi.fn() },
    loan: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { POST as borrowPost } from "@/app/api/loans/route";
import { POST as returnPost } from "@/app/api/loans/[id]/return/route";

function makeReq(url: string, method: string, body?: object, token?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["cookie"] = `library-session=${token}`;
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function tokenFor(role: "student" | "librarian" | "manager", userId = `uid-${role}`) {
  return encrypt({ userId, email: `${role}@t.dev`, role });
}

const fakeBook = (overrides: Partial<{
  id: string; availableCopies: number; totalCopies: number;
}> = {}) => ({
  id: "book-1",
  title: "Test Book",
  author: "Author",
  isbn: null,
  totalCopies: 3,
  availableCopies: 2,
  createdAt: new Date(),
  ...overrides,
});

const fakeRules = () => ({
  id: 1,
  loanPeriodDays: 14,
  maxBooksPerStudent: 3,
  finePerDay: null,
  updatedAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction calls the callback with db as the transaction proxy
  vi.mocked(db.$transaction).mockImplementation(async (cb: (tx: typeof db) => Promise<unknown>) =>
    cb(db as unknown as typeof db)
  );
});

// ---- POST /api/loans (borrow) -----------------------------------------------

describe("POST /api/loans (borrow)", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/loans", {
      method: "POST",
      body: JSON.stringify({ bookId: "book-1" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await borrowPost(req);
    expect(res.status).toBe(401);
  });

  it("returns 409 when no copies available", async () => {
    const token = await tokenFor("student");
    vi.mocked(db.book.findUnique).mockResolvedValueOnce(fakeBook({ availableCopies: 0 }) as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.loan.count).mockResolvedValueOnce(0);

    const req = makeReq("http://localhost/api/loans", "POST", { bookId: "book-1" }, token);
    const res = await borrowPost(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/available/i);
  });

  it("returns 409 when student is at max_books_per_student", async () => {
    const token = await tokenFor("student");
    vi.mocked(db.book.findUnique).mockResolvedValueOnce(fakeBook() as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.loan.count).mockResolvedValueOnce(3); // at max of 3

    const req = makeReq("http://localhost/api/loans", "POST", { bookId: "book-1" }, token);
    const res = await borrowPost(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/limit/i);
  });

  it("creates a loan and decrements availableCopies (student)", async () => {
    const token = await tokenFor("student", "student-1");
    vi.mocked(db.book.findUnique).mockResolvedValueOnce(fakeBook() as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.loan.count).mockResolvedValueOnce(0);
    vi.mocked(db.loan.create).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-1", dueAt: new Date(),
      borrowedAt: new Date(), returnedAt: null, reminderSent: false,
    } as any);
    vi.mocked(db.book.update).mockResolvedValueOnce({} as any);

    const req = makeReq("http://localhost/api/loans", "POST", { bookId: "book-1" }, token);
    const res = await borrowPost(req);
    expect(res.status).toBe(201);

    expect(vi.mocked(db.loan.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookId: "book-1", userId: "student-1" }),
      })
    );
    expect(vi.mocked(db.book.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableCopies: { decrement: 1 } } })
    );
  });

  it("creates a loan on behalf of a student (librarian)", async () => {
    const token = await tokenFor("librarian");
    vi.mocked(db.book.findUnique).mockResolvedValueOnce(fakeBook() as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.loan.count).mockResolvedValueOnce(0);
    vi.mocked(db.loan.create).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-99", dueAt: new Date(),
      borrowedAt: new Date(), returnedAt: null, reminderSent: false,
    } as any);
    vi.mocked(db.book.update).mockResolvedValueOnce({} as any);

    const req = makeReq(
      "http://localhost/api/loans",
      "POST",
      { bookId: "book-1", userId: "student-99" },
      token
    );
    const res = await borrowPost(req);
    expect(res.status).toBe(201);
    expect(vi.mocked(db.loan.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "student-99" }),
      })
    );
  });
});

// ---- POST /api/loans/:id/return ---------------------------------------------

describe("POST /api/loans/:id/return", () => {
  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/loans/loan-1/return", { method: "POST" });
    const res = await returnPost(req, { params: Promise.resolve({ id: "loan-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 409 when loan is already returned", async () => {
    const token = await tokenFor("student", "student-1");
    vi.mocked(db.loan.findUnique).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-1",
      borrowedAt: new Date(), dueAt: new Date(), returnedAt: new Date(), reminderSent: false,
    } as any);

    const req = makeReq("http://localhost/api/loans/loan-1/return", "POST", undefined, token);
    const res = await returnPost(req, { params: Promise.resolve({ id: "loan-1" }) });
    expect(res.status).toBe(409);
  });

  it("sets returnedAt and increments availableCopies", async () => {
    const token = await tokenFor("student", "student-1");
    vi.mocked(db.loan.findUnique).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-1",
      borrowedAt: new Date(), dueAt: new Date(), returnedAt: null, reminderSent: false,
    } as any);
    vi.mocked(db.loan.update).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-1", returnedAt: new Date(), reminderSent: false,
    } as any);
    vi.mocked(db.book.update).mockResolvedValueOnce({} as any);

    const req = makeReq("http://localhost/api/loans/loan-1/return", "POST", undefined, token);
    const res = await returnPost(req, { params: Promise.resolve({ id: "loan-1" }) });
    expect(res.status).toBe(200);

    expect(vi.mocked(db.loan.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ returnedAt: expect.any(Date) }),
      })
    );
    expect(vi.mocked(db.book.update)).toHaveBeenCalledWith(
      expect.objectContaining({ data: { availableCopies: { increment: 1 } } })
    );
  });

  it("returns 403 when student tries to return another student's loan", async () => {
    const token = await tokenFor("student", "student-1");
    vi.mocked(db.loan.findUnique).mockResolvedValueOnce({
      id: "loan-1", bookId: "book-1", userId: "student-99",
      borrowedAt: new Date(), dueAt: new Date(), returnedAt: null, reminderSent: false,
    } as any);

    const req = makeReq("http://localhost/api/loans/loan-1/return", "POST", undefined, token);
    const res = await returnPost(req, { params: Promise.resolve({ id: "loan-1" }) });
    expect(res.status).toBe(403);
  });
});
