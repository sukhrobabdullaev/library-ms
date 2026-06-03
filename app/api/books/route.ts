import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Require any authenticated user
  const token = req.cookies.get("library-session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const books = await db.book.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { author: { contains: q, mode: "insensitive" } },
            { isbn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ books });
}

export const POST = withAuth(["librarian", "manager"], async (req) => {
  let body: {
    title?: string;
    author?: string;
    isbn?: string;
    totalCopies?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, author, isbn, totalCopies } = body;
  if (!title || !author || !totalCopies || totalCopies < 1) {
    return NextResponse.json({ error: "title, author, totalCopies required" }, { status: 400 });
  }

  try {
    const book = await db.book.create({
      data: {
        title,
        author,
        isbn: isbn || null,
        totalCopies,
        availableCopies: totalCopies,
      },
    });
    return NextResponse.json({ book }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "ISBN already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create book" }, { status: 500 });
  }
});
