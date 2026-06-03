// @vitest-environment node
import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

// Must mock before importing route handlers
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("dotenv/config", () => ({}));

// Mock DB with seeded users
const STUDENT_HASH =
  "$2a$10$mockstudent"; // replaced by bcrypt mock below

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(async (plain: string, hash: string) => {
      return plain === "password123" && hash === "correct-hash";
    }),
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) => {
        const users: Record<string, object> = {
          "student@test.dev": {
            id: "user-student",
            name: "Carol",
            email: "student@test.dev",
            role: "student",
            passwordHash: "correct-hash",
          },
          "librarian@test.dev": {
            id: "user-lib",
            name: "Bob",
            email: "librarian@test.dev",
            role: "librarian",
            passwordHash: "correct-hash",
          },
          "manager@test.dev": {
            id: "user-mgr",
            name: "Alice",
            email: "manager@test.dev",
            role: "manager",
            passwordHash: "correct-hash",
          },
        };
        return users[where.email] ?? null;
      }),
    },
  },
}));

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { encrypt } from "@/lib/session";
import { withAuth } from "@/lib/auth";

// Helper: create a request with a valid session cookie
async function requestWithSession(
  role: "student" | "librarian" | "manager",
  url = "http://localhost/api/test"
) {
  const token = await encrypt({
    userId: `user-${role}`,
    email: `${role}@test.dev`,
    role,
  });
  return new NextRequest(url, {
    method: "GET",
    headers: { cookie: `library-session=${token}` },
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when body is missing fields", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@x.com" }),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for unknown email", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@test.dev", password: "password123" }),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@test.dev", password: "wrong" }),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 200 and user data for correct credentials", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@test.dev",
        password: "password123",
      }),
    });
    const res = await loginPOST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe("student");
    const cookieStore = await cookies();
    expect(cookieStore.set).toHaveBeenCalled();
  });
});

describe("withAuth role guard", () => {
  it("returns 401 when no session cookie is present", async () => {
    const req = new NextRequest("http://localhost/api/test");
    const handler = withAuth(["librarian", "manager"], async () =>
      Response.json({ ok: true }) as any
    );
    const res = await handler(req, {});
    expect(res.status).toBe(401);
  });

  it("returns 403 when student calls a librarian-only route", async () => {
    const req = await requestWithSession("student");
    const handler = withAuth(["librarian", "manager"], async () =>
      Response.json({ ok: true }) as any
    );
    const res = await handler(req, {});
    expect(res.status).toBe(403);
  });

  it("returns 403 when librarian calls a manager-only route", async () => {
    const req = await requestWithSession("librarian");
    const handler = withAuth(["manager"], async () =>
      Response.json({ ok: true }) as any
    );
    const res = await handler(req, {});
    expect(res.status).toBe(403);
  });

  it("returns 200 when librarian calls a librarian+ route", async () => {
    const req = await requestWithSession("librarian");
    const handler = withAuth(["librarian", "manager"], async () =>
      Response.json({ ok: true }) as any
    );
    const res = await handler(req, {});
    expect(res.status).toBe(200);
  });
});
