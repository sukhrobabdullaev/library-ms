import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import RulesForm from "@/components/RulesForm";

export default async function RulesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "manager") redirect("/staff/dashboard");

  const rules = await db.rules.findFirst();
  if (!rules) return <p className="p-10 text-gray-500">Rules not configured.</p>;

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Borrowing Rules</h1>
      <p className="text-sm text-gray-500 mb-8">
        Changes take effect immediately for all new loans.
      </p>
      <RulesForm
        initial={{
          loanPeriodDays: rules.loanPeriodDays,
          maxBooksPerStudent: rules.maxBooksPerStudent,
          finePerDay: rules.finePerDay,
        }}
      />
    </div>
  );
}
