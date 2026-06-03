import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";
import { canBorrow } from "@/lib/loans";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { bookId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bookId, userId: bodyUserId } = body;
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  let targetUserId: string;
  if (session.role === "student") {
    targetUserId = session.userId;
  } else {
    if (!bodyUserId) return NextResponse.json({ error: "userId required for staff" }, { status: 400 });
    targetUserId = bodyUserId;
  }

  const [book, rules] = await Promise.all([
    db.book.findUnique({ where: { id: bookId } }),
    db.rules.findFirst(),
  ]);

  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
  if (!rules) return NextResponse.json({ error: "Rules not configured" }, { status: 500 });

  const activeLoansCount = await db.loan.count({
    where: { userId: targetUserId, returnedAt: null },
  });

  const check = canBorrow(book.availableCopies, activeLoansCount, rules.maxBooksPerStudent);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  const dueAt = new Date();
  dueAt.setUTCDate(dueAt.getUTCDate() + rules.loanPeriodDays);

  const loan = await db.$transaction(async (tx) => {
    const newLoan = await tx.loan.create({
      data: { bookId, userId: targetUserId, dueAt },
    });
    await tx.book.update({
      where: { id: bookId },
      data: { availableCopies: { decrement: 1 } },
    });
    return newLoan;
  });

  return NextResponse.json({ loan }, { status: 201 });
}
