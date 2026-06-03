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
    loan: { findMany: vi.fn() },
    book: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET as overdueGet } from "@/app/api/reports/overdue/route";
import { GET as popularGet } from "@/app/api/reports/popular/route";

async function tokenFor(role: "student" | "librarian" | "manager", userId = `uid-${role}`) {
  return encrypt({ userId, email: `${role}@t.dev`, role });
}

function makeReq(url: string, token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers["cookie"] = `library-session=${token}`;
  return new NextRequest(url, { method: "GET", headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---- GET /api/reports/overdue -----------------------------------------------

describe("GET /api/reports/overdue", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await overdueGet(makeReq("http://localhost/api/reports/overdue"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for student", async () => {
    const token = await tokenFor("student");
    const res = await overdueGet(makeReq("http://localhost/api/reports/overdue", token));
    expect(res.status).toBe(403);
  });

  it("returns overdue loans with daysLate field (librarian)", async () => {
    const token = await tokenFor("librarian");
    const twoDaysAgo = new Date(Date.now() - 2 * 86400_000);

    vi.mocked(db.loan.findMany).mockResolvedValueOnce([
      {
        id: "loan-1",
        dueAt: twoDaysAgo,
        returnedAt: null,
        reminderSent: false,
        userId: "student-1",
        bookId: "book-1",
        borrowedAt: new Date(Date.now() - 16 * 86400_000),
        user: { id: "student-1", name: "Dan Student", email: "dan@t.dev" },
        book: { id: "book-1", title: "Overdue Book", author: "Author" },
      },
    ] as any);

    const res = await overdueGet(makeReq("http://localhost/api/reports/overdue", token));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.loans).toHaveLength(1);
    expect(body.loans[0].id).toBe("loan-1");
    expect(body.loans[0].daysLate).toBeGreaterThanOrEqual(2);
  });

  it("returns overdue loans for manager too", async () => {
    const token = await tokenFor("manager");
    vi.mocked(db.loan.findMany).mockResolvedValueOnce([] as any);

    const res = await overdueGet(makeReq("http://localhost/api/reports/overdue", token));
    expect(res.status).toBe(200);
    expect((await res.json()).loans).toHaveLength(0);
  });
});

// ---- GET /api/reports/popular -----------------------------------------------

describe("GET /api/reports/popular", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await popularGet(makeReq("http://localhost/api/reports/popular"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for student", async () => {
    const token = await tokenFor("student");
    const res = await popularGet(makeReq("http://localhost/api/reports/popular", token));
    expect(res.status).toBe(403);
  });

  it("returns books with borrowCount ordered most-borrowed first", async () => {
    const token = await tokenFor("librarian");

    vi.mocked(db.book.findMany).mockResolvedValueOnce([
      {
        id: "book-1", title: "Popular Book", author: "A", isbn: null,
        totalCopies: 5, availableCopies: 3, createdAt: new Date(),
        _count: { loans: 10 },
      },
      {
        id: "book-2", title: "Less Popular", author: "B", isbn: null,
        totalCopies: 2, availableCopies: 1, createdAt: new Date(),
        _count: { loans: 2 },
      },
    ] as any);

    const res = await popularGet(makeReq("http://localhost/api/reports/popular", token));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.books).toHaveLength(2);
    expect(body.books[0].borrowCount).toBe(10);
    expect(body.books[0].id).toBe("book-1");
    expect(body.books[1].borrowCount).toBe(2);
  });
});
