// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { encrypt } from "@/lib/session";

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
vi.mock("dotenv/config", () => ({}));

// ---- DB mock ----------------------------------------------------------------
const bookStore = new Map<string, object>();
let idCounter = 0;
const makeId = () => `book-${++idCounter}`;

vi.mock("@/lib/db", () => ({
  db: {
    book: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const book = { id: makeId(), ...data };
        bookStore.set(book.id, book);
        return book;
      }),
      findMany: vi.fn(async ({ where }: { where?: { OR?: object[] } } = {}) => {
        const all = [...bookStore.values()] as Record<string, unknown>[];
        if (!where?.OR) return all;
        const q = (where.OR[0] as any)?.title?.contains?.toLowerCase() ?? "";
        return all.filter(
          (b: any) =>
            b.title?.toLowerCase().includes(q) ||
            b.author?.toLowerCase().includes(q) ||
            b.isbn?.toLowerCase().includes(q)
        );
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        bookStore.get(where.id) ?? null
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: object }) => {
        const existing = bookStore.get(where.id) as Record<string, unknown>;
        const updated = { ...existing, ...data };
        bookStore.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        bookStore.delete(where.id);
        return {};
      }),
    },
  },
}));

import { GET, POST } from "@/app/api/books/route";
import {
  PATCH,
  DELETE,
} from "@/app/api/books/[id]/route";

// ---- helpers ----------------------------------------------------------------
async function tokenFor(role: "student" | "librarian" | "manager") {
  return encrypt({ userId: `uid-${role}`, email: `${role}@t.dev`, role });
}

function makeReq(
  url: string,
  method: string,
  body?: object,
  token?: string
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["cookie"] = `library-session=${token}`;
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---- tests ------------------------------------------------------------------
describe("GET /api/books", () => {
  beforeEach(() => {
    bookStore.clear();
    idCounter = 0;
  });

  it("returns 401 when unauthenticated", async () => {
    const req = new NextRequest("http://localhost/api/books");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns all books when no query", async () => {
    const token = await tokenFor("student");
    bookStore.set("b1", { id: "b1", title: "Dune", author: "Herbert", isbn: null, totalCopies: 3, availableCopies: 3 });
    const req = makeReq("http://localhost/api/books", "GET", undefined, token);
    const res = await GET(req);
    expect(res.status).toBe(200);
    const { books } = await res.json();
    expect(books.length).toBe(1);
  });

  it("filters by title query", async () => {
    const token = await tokenFor("student");
    bookStore.set("b1", { id: "b1", title: "Dune", author: "Herbert", isbn: null, totalCopies: 3, availableCopies: 3 });
    bookStore.set("b2", { id: "b2", title: "Foundation", author: "Asimov", isbn: null, totalCopies: 2, availableCopies: 2 });
    const req = makeReq("http://localhost/api/books?q=dune", "GET", undefined, token);
    const res = await GET(req);
    const { books } = await res.json();
    expect(books.length).toBe(1);
    expect((books[0] as any).title).toBe("Dune");
  });
});

describe("POST /api/books", () => {
  beforeEach(() => {
    bookStore.clear();
    idCounter = 0;
  });

  it("returns 403 when called by a student", async () => {
    const token = await tokenFor("student");
    const req = makeReq(
      "http://localhost/api/books",
      "POST",
      { title: "X", author: "Y", totalCopies: 2 },
      token
    );
    const res = await POST(req, {});
    expect(res.status).toBe(403);
  });

  it("creates a book with availableCopies = totalCopies", async () => {
    const token = await tokenFor("librarian");
    const req = makeReq(
      "http://localhost/api/books",
      "POST",
      { title: "New Book", author: "Author", isbn: "123", totalCopies: 4 },
      token
    );
    const res = await POST(req, {});
    expect(res.status).toBe(201);
    const { book } = await res.json();
    expect(book.availableCopies).toBe(book.totalCopies);
    expect(book.totalCopies).toBe(4);
  });

  it("returns 400 when required fields are missing", async () => {
    const token = await tokenFor("librarian");
    const req = makeReq(
      "http://localhost/api/books",
      "POST",
      { title: "Only Title" },
      token
    );
    const res = await POST(req, {});
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/books/:id", () => {
  beforeEach(() => {
    bookStore.clear();
    idCounter = 0;
    bookStore.set("book-1", {
      id: "book-1",
      title: "Old Title",
      author: "Old Author",
      isbn: null,
      totalCopies: 2,
      availableCopies: 2,
    });
  });

  it("returns 403 for student", async () => {
    const token = await tokenFor("student");
    const req = makeReq("http://localhost/api/books/book-1", "PATCH", { title: "New" }, token);
    const res = await PATCH(req, { params: Promise.resolve({ id: "book-1" }) });
    expect(res.status).toBe(403);
  });

  it("updates the book record", async () => {
    const token = await tokenFor("librarian");
    const req = makeReq(
      "http://localhost/api/books/book-1",
      "PATCH",
      { title: "Updated Title" },
      token
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "book-1" }) });
    expect(res.status).toBe(200);
    const { book } = await res.json();
    expect(book.title).toBe("Updated Title");
  });
});

describe("DELETE /api/books/:id", () => {
  beforeEach(() => {
    bookStore.clear();
    idCounter = 0;
    bookStore.set("book-1", {
      id: "book-1",
      title: "To Delete",
      author: "Author",
      isbn: null,
      totalCopies: 1,
      availableCopies: 1,
    });
  });

  it("returns 403 for student", async () => {
    const token = await tokenFor("student");
    const req = makeReq("http://localhost/api/books/book-1", "DELETE", undefined, token);
    const res = await DELETE(req, { params: Promise.resolve({ id: "book-1" }) });
    expect(res.status).toBe(403);
  });

  it("deletes the book", async () => {
    const token = await tokenFor("librarian");
    const req = makeReq("http://localhost/api/books/book-1", "DELETE", undefined, token);
    const res = await DELETE(req, { params: Promise.resolve({ id: "book-1" }) });
    expect(res.status).toBe(200);
    expect(bookStore.has("book-1")).toBe(false);
  });
});
