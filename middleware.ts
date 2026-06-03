import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("library-session")?.value;
  const session = token ? await decrypt(token) : null;

  if (PUBLIC_PATHS.includes(pathname)) {
    if (session) {
      const dest = session.role === "student" ? "/student/dashboard" : "/staff/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/student") && session.role !== "student") {
    return NextResponse.redirect(new URL("/staff/dashboard", request.url));
  }

  if (pathname.startsWith("/staff") && session.role === "student") {
    return NextResponse.redirect(new URL("/student/dashboard", request.url));
  }

  if (pathname.startsWith("/manager") && session.role !== "manager") {
    return NextResponse.redirect(new URL("/staff/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
