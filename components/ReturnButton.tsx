"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReturnButton({ loanId }: { loanId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReturn() {
    setLoading(true);
    await fetch(`/api/loans/${loanId}/return`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleReturn}
      disabled={loading}
      className="rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-60"
    >
      {loading ? "Returning…" : "Return"}
    </button>
  );
}
