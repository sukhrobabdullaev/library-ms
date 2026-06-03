import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import BorrowReturnButton from "@/components/BorrowReturnButton";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [book, user] = await Promise.all([
    db.book.findUnique({ where: { id } }),
    getCurrentUser(),
  ]);
  if (!book) notFound();

  let activeLoanId: string | undefined;
  if (user?.role === "student") {
    const activeLoan = await db.loan.findFirst({
      where: { bookId: id, userId: user.id, returnedAt: null },
    });
    activeLoanId = activeLoan?.id;
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Link href="/catalog" className="text-sm text-blue-600 hover:underline mb-6 block">
        ← Back to catalog
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">{book.title}</h1>
      <p className="text-gray-600 mt-1">{book.author}</p>
      {book.isbn && (
        <p className="text-sm text-gray-400 mt-1">ISBN: {book.isbn}</p>
      )}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Total copies:</span> {book.totalCopies}
        </p>
        <p className="text-sm text-gray-700 mt-1">
          <span className="font-medium">Available:</span>{" "}
          <span
            className={
              book.availableCopies > 0 ? "text-green-600 font-medium" : "text-red-500 font-medium"
            }
          >
            {book.availableCopies}
          </span>
        </p>
      </div>
      {user?.role === "student" && (
        <BorrowReturnButton
          bookId={book.id}
          activeLoanId={activeLoanId}
          available={book.availableCopies}
        />
      )}
    </div>
  );
}
