// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
    loan: { findMany: vi.fn(), update: vi.fn() },
    notification: { findMany: vi.fn(), create: vi.fn() },
    rules: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { POST as cronPost } from "@/app/api/cron/reminders/route";

const TEST_SECRET = "test-cron-secret";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = TEST_SECRET;
  vi.mocked(db.$transaction).mockImplementation(
    async (cb: (tx: typeof db) => Promise<unknown>) => cb(db as unknown as typeof db)
  );
});

function makeReq(secret?: string) {
  const headers: Record<string, string> = {};
  if (secret) headers["x-cron-secret"] = secret;
  return new NextRequest("http://localhost/api/cron/reminders", { method: "POST", headers });
}

const fakeRules = () => ({
  id: 1,
  loanPeriodDays: 14,
  maxBooksPerStudent: 3,
  finePerDay: null,
  updatedAt: new Date(),
});

const overdueLoan = {
  id: "loan-overdue",
  bookId: "book-1",
  userId: "student-1",
  borrowedAt: new Date(Date.now() - 16 * 86400_000),
  dueAt: new Date(Date.now() - 2 * 86400_000),
  returnedAt: null,
  reminderSent: false,
  user: { id: "student-1", email: "student@test.dev", name: "Test Student" },
  book: { id: "book-1", title: "Overdue Book", author: "Author" },
};

describe("POST /api/cron/reminders", () => {
  it("returns 401 without cron secret", async () => {
    const res = await cronPost(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong cron secret", async () => {
    const res = await cronPost(makeReq("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("sends email and writes notification row for an overdue loan", async () => {
    vi.mocked(db.loan.findMany).mockResolvedValueOnce([overdueLoan] as any);
    vi.mocked(db.notification.findMany).mockResolvedValueOnce([] as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);
    vi.mocked(db.notification.create).mockResolvedValueOnce({} as any);
    vi.mocked(db.loan.update).mockResolvedValueOnce({} as any);

    const res = await cronPost(makeReq(TEST_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).sent).toBe(1);

    expect(vi.mocked(sendEmail)).toHaveBeenCalledOnce();
    expect(vi.mocked(db.notification.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loanId: "loan-overdue",
          userId: "student-1",
          type: "overdue",
        }),
      })
    );
    expect(vi.mocked(db.loan.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loan-overdue" },
        data: { reminderSent: true },
      })
    );
  });

  it("does not send duplicate notification when reminderSent is true (dedup)", async () => {
    const alreadySentLoan = { ...overdueLoan, reminderSent: true };
    vi.mocked(db.loan.findMany).mockResolvedValueOnce([alreadySentLoan] as any);
    vi.mocked(db.notification.findMany).mockResolvedValueOnce([
      { loanId: "loan-overdue", type: "overdue" },
    ] as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);

    const res = await cronPost(makeReq(TEST_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).sent).toBe(0);

    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(db.notification.create)).not.toHaveBeenCalled();
  });

  it("returns sent: 0 when there are no loans needing reminders", async () => {
    vi.mocked(db.loan.findMany).mockResolvedValueOnce([] as any);
    vi.mocked(db.notification.findMany).mockResolvedValueOnce([] as any);
    vi.mocked(db.rules.findFirst).mockResolvedValueOnce(fakeRules() as any);

    const res = await cronPost(makeReq(TEST_SECRET));
    expect(res.status).toBe(200);
    expect((await res.json()).sent).toBe(0);
    expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
  });
});
