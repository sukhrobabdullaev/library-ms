import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers before importing anything that uses it
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock the DB so we don't need a real connection
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

// Mock dotenv/config
vi.mock("dotenv/config", () => ({}));

import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      delete: vi.fn(),
    } as any);
  });

  it("returns null when there is no session cookie", async () => {
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("returns null when session cookie holds an invalid token", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "not-a-valid-jwt" }),
      set: vi.fn(),
      delete: vi.fn(),
    } as any);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
