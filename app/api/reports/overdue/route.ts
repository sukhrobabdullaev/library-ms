import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const overdueLoans = await db.loan.findMany({
    where: { returnedAt: null, dueAt: { lt: now } },
    include: {
      user: { select: { id: true, name: true, email: true } },
      book: { select: { id: true, title: true, author: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  const loans = overdueLoans.map((loan) => ({
    ...loan,
    daysLate: Math.floor((now.getTime() - loan.dueAt.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return NextResponse.json({ loans });
}
