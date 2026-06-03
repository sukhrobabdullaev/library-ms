import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth(["librarian", "manager"], async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;
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

  const existing = await db.book.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, author, isbn, totalCopies } = body;

  // If totalCopies changes, adjust availableCopies by the delta
  let availableCopies = existing.availableCopies;
  if (totalCopies !== undefined && totalCopies !== existing.totalCopies) {
    const delta = totalCopies - existing.totalCopies;
    availableCopies = Math.max(0, existing.availableCopies + delta);
  }

  const book = await db.book.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(author !== undefined && { author }),
      ...(isbn !== undefined && { isbn }),
      ...(totalCopies !== undefined && { totalCopies, availableCopies }),
    },
  });

  return NextResponse.json({ book });
});

export const DELETE = withAuth(["librarian", "manager"], async (req, ctx) => {
  const { id } = await (ctx as Ctx).params;

  const existing = await db.book.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
