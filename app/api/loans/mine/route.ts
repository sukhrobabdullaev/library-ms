import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookSelect = { select: { id: true, title: true, author: true } };

  const [activeLoans, returnedLoans] = await Promise.all([
    db.loan.findMany({
      where: { userId: session.userId, returnedAt: null },
      include: { book: bookSelect },
      orderBy: { dueAt: "asc" },
    }),
    db.loan.findMany({
      where: { userId: session.userId, returnedAt: { not: null } },
      include: { book: bookSelect },
      orderBy: { returnedAt: "desc" },
    }),
  ]);

  return NextResponse.json({ activeLoans, returnedLoans });
}
