import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await db.book.findMany({
    include: { _count: { select: { loans: true } } },
    orderBy: { loans: { _count: "desc" } },
  });

  const books = raw.map((book) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    totalCopies: book.totalCopies,
    availableCopies: book.availableCopies,
    borrowCount: book._count.loans,
  }));

  return NextResponse.json({ books });
}
