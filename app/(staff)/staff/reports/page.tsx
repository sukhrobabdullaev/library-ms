import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role === "student") redirect("/student/dashboard");

  const now = new Date();

  const [overdueLoans, allBooks] = await Promise.all([
    db.loan.findMany({
      where: { returnedAt: null, dueAt: { lt: now } },
      include: {
        user: { select: { name: true, email: true } },
        book: { select: { id: true, title: true, author: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    db.book.findMany({
      include: { _count: { select: { loans: true } } },
      orderBy: { loans: { _count: "desc" } },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-12">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      {/* Overdue loans */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Overdue Loans ({overdueLoans.length})
        </h2>
        {overdueLoans.length === 0 ? (
          <p className="text-sm text-gray-500">No overdue loans.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Book</th>
                  <th className="py-2 pr-4">Due date</th>
                  <th className="py-2">Days late</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.map((loan) => {
                  const daysLate = Math.floor(
                    (now.getTime() - loan.dueAt.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={loan.id} className="border-b border-gray-100 hover:bg-red-50">
                      <td className="py-3 pr-4 text-gray-900">{loan.user.name}</td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/catalog/${loan.book.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {loan.book.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-red-600 font-medium">
                        {loan.dueAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 font-semibold text-red-700">{daysLate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Most borrowed books */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Most Borrowed Books</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 uppercase text-xs tracking-wide">
                <th className="py-2 pr-4">Rank</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Author</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2">Total borrows</th>
              </tr>
            </thead>
            <tbody>
              {allBooks.map((book, i) => (
                <tr key={book.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-400 font-mono">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/catalog/${book.id}`}
                      className="text-gray-900 hover:underline font-medium"
                    >
                      {book.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{book.author}</td>
                  <td className="py-3 pr-4 text-gray-600">
                    {book.availableCopies}/{book.totalCopies}
                  </td>
                  <td className="py-3 font-semibold text-gray-900">{book._count.loans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
