"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Book = { id: string; title: string; author: string; availableCopies: number };
type Student = { id: string; name: string; email: string };

type Props = {
  books: Book[];
  students: Student[];
};

export default function DeskBorrowForm({ books, students }: Props) {
  const router = useRouter();
  const [bookId, setBookId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, userId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to borrow");
      return;
    }

    setSuccess("Book borrowed successfully.");
    setBookId("");
    setUserId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.email})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          required
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select book…</option>
          {books.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} — {b.author} ({b.availableCopies} avail.)
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Borrowing…" : "Borrow"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      {success && <p className="w-full text-sm text-green-600">{success}</p>}
    </form>
  );
}
