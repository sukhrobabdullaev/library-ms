"use client";

import { useState } from "react";

type Props = {
  bookId: string;
  activeLoanId?: string;
  available: number;
};

export default function BorrowReturnButton({ bookId, activeLoanId, available }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBorrow() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to borrow");
      return;
    }
    window.location.reload();
  }

  async function handleReturn() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/loans/${activeLoanId}/return`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to return");
      return;
    }
    window.location.reload();
  }

  if (activeLoanId) {
    return (
      <div className="mt-6">
        <button
          onClick={handleReturn}
          disabled={loading}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {loading ? "Returning…" : "Return Book"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (available <= 0) {
    return <p className="mt-6 text-sm text-gray-500 italic">No copies currently available.</p>;
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleBorrow}
        disabled={loading}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Borrowing…" : "Borrow Book"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
