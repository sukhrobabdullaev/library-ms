import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import DeskBorrowForm from "@/components/DeskBorrowForm";
import ReturnButton from "@/components/ReturnButton";

export default async function StaffLoansPage() {
  const user = await getCurrentUser();
  if (!user || user.role === "student") redirect("/student/dashboard");

  const [activeLoans, books, students] = await Promise.all([
    db.loan.findMany({
      where: { returnedAt: null },
      include: { book: true, user: true },
      orderBy: { dueAt: "asc" },
    }),
    db.book.findMany({
      where: { availableCopies: { gt: 0 } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, author: true, availableCopies: true },
    }),
    db.user.findMany({
      where: { role: "student" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const now = new Date();

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Loans Desk</h1>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Borrow on Behalf of Student</h2>
        {students.length === 0 ? (
          <p className="text-sm text-gray-500">No students registered.</p>
        ) : books.length === 0 ? (
          <p className="text-sm text-gray-500">No books available to borrow.</p>
        ) : (
          <DeskBorrowForm books={books} students={students} />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Active Loans ({activeLoans.length})
        </h2>
        {activeLoans.length === 0 ? (
          <p className="text-sm text-gray-500">No active loans.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 uppercase text-xs tracking-wide">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Book</th>
                  <th className="py-2 pr-4">Borrowed</th>
                  <th className="py-2 pr-4">Due</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan) => {
                  const overdue = loan.dueAt < now;
                  return (
                    <tr key={loan.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4 text-gray-900">{loan.user.name}</td>
                      <td className="py-3 pr-4 text-gray-900">{loan.book.title}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {loan.borrowedAt.toLocaleDateString()}
                      </td>
                      <td
                        className={`py-3 pr-4 font-medium ${
                          overdue ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {loan.dueAt.toLocaleDateString()}
                        {overdue && " (overdue)"}
                      </td>
                      <td className="py-3">
                        <ReturnButton loanId={loan.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
