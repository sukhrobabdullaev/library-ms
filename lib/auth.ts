import { NextRequest, NextResponse } from "next/server";
import { getSession, decrypt } from "./session";
import { db } from "./db";
import type { Role } from "@/app/generated/prisma/client";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}

type Handler = (
  req: NextRequest,
  ctx: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withAuth(roles: Role[], handler: Handler): Handler {
  return async (req, ctx) => {
    const token = req.cookies.get("library-session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await decrypt(token);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!roles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, ctx);
  };
}

export function dashboardUrl(role: Role): string {
  return role === "student" ? "/student/dashboard" : "/staff/dashboard";
}
