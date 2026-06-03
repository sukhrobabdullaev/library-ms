import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const loan = await db.loan.findUnique({ where: { id } });
  if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  if (loan.returnedAt) return NextResponse.json({ error: "Already returned" }, { status: 409 });

  if (session.role === "student" && loan.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedLoan = await db.$transaction(async (tx) => {
    const result = await tx.loan.update({
      where: { id },
      data: { returnedAt: new Date() },
    });
    await tx.book.update({
      where: { id: loan.bookId },
      data: { availableCopies: { increment: 1 } },
    });
    return result;
  });

  return NextResponse.json({ loan: updatedLoan });
}
