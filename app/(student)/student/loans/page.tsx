import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOverdue } from "@/lib/loans";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyLoansPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const bookSelect = { select: { id: true, title: true, author: true } };

  const [activeLoans, returnedLoans] = await Promise.all([
    db.loan.findMany({
      where: { userId: user.id, returnedAt: null },
      include: { book: bookSelect },
      orderBy: { dueAt: "asc" },
    }),
    db.loan.findMany({
      where: { userId: user.id, returnedAt: { not: null } },
      include: { book: bookSelect },
      orderBy: { returnedAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">My Loans</h1>

      {/* Active loans */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Active ({activeLoans.length})
        </h2>
        {activeLoans.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active loans.{" "}
            <Link href="/catalog" className="text-blue-600 hover:underline">
              Browse the catalog
            </Link>{" "}
            to borrow a book.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeLoans.map((loan) => {
              const overdue = isOverdue(loan);
              return (
                <li
                  key={loan.id}
                  className={`rounded-lg border p-4 ${
                    overdue
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/catalog/${loan.book.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {loan.book.title}
                      </Link>
                      <p className="text-sm text-gray-500 mt-0.5">{loan.book.author}</p>
                    </div>
                    {overdue && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-6 text-xs text-gray-500">
                    <span>Borrowed: {loan.borrowedAt.toLocaleDateString()}</span>
                    <span
                      className={overdue ? "text-red-600 font-medium" : ""}
                    >
                      Due: {loan.dueAt.toLocaleDateString()}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Loan history */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          History ({returnedLoans.length})
        </h2>
        {returnedLoans.length === 0 ? (
          <p className="text-sm text-gray-500">No returned loans yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {returnedLoans.map((loan) => (
              <li key={loan.id} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/catalog/${loan.book.id}`}
                      className="text-sm font-medium text-gray-700 hover:underline"
                    >
                      {loan.book.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{loan.book.author}</p>
                  </div>
                  <div className="text-xs text-gray-400 text-right shrink-0">
                    <p>Borrowed: {loan.borrowedAt.toLocaleDateString()}</p>
                    <p>Returned: {loan.returnedAt!.toLocaleDateString()}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
