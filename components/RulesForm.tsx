"use client";

import { useState } from "react";

type RulesValues = {
  loanPeriodDays: number;
  maxBooksPerStudent: number;
  finePerDay: number | null;
};

export default function RulesForm({ initial }: { initial: RulesValues }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const res = await fetch("/api/rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setStatus("saved");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Loan period (days)
        </label>
        <input
          type="number"
          name="loanPeriodDays"
          min="1"
          value={values.loanPeriodDays}
          onChange={(e) =>
            setValues({ ...values, loanPeriodDays: parseInt(e.target.value, 10) })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max books per student
        </label>
        <input
          type="number"
          name="maxBooksPerStudent"
          min="1"
          value={values.maxBooksPerStudent}
          onChange={(e) =>
            setValues({ ...values, maxBooksPerStudent: parseInt(e.target.value, 10) })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fine per day (optional)
        </label>
        <input
          type="number"
          name="finePerDay"
          min="0"
          step="0.01"
          value={values.finePerDay ?? ""}
          onChange={(e) =>
            setValues({
              ...values,
              finePerDay: e.target.value ? parseFloat(e.target.value) : null,
            })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="No fine"
        />
      </div>

      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save Rules"}
      </button>

      {status === "saved" && (
        <p className="text-sm text-green-600">Rules saved successfully.</p>
      )}
      {status === "error" && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
