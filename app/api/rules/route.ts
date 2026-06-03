import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/session";

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("library-session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await decrypt(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { loanPeriodDays?: number; maxBooksPerStudent?: number; finePerDay?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await db.rules.findFirst();
  if (!existing) return NextResponse.json({ error: "Rules not configured" }, { status: 500 });

  const updated = await db.rules.update({
    where: { id: existing.id },
    data: {
      ...(body.loanPeriodDays !== undefined && { loanPeriodDays: body.loanPeriodDays }),
      ...(body.maxBooksPerStudent !== undefined && { maxBooksPerStudent: body.maxBooksPerStudent }),
      ...(body.finePerDay !== undefined && { finePerDay: body.finePerDay }),
    },
  });

  return NextResponse.json({ rules: updated });
}
