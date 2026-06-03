import Link from "next/link";
import { db } from "@/lib/db";
import DeleteBookButton from "@/components/DeleteBookButton";

export default async function BooksManagementPage() {
  const books = await db.book.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Books</h1>
        <Link
          href="/staff/books/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add book
        </Link>
      </div>

      {books.length === 0 ? (
        <p className="text-gray-500">No books yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2 font-medium">Title</th>
              <th className="pb-2 font-medium">Author</th>
              <th className="pb-2 font-medium text-right">Copies</th>
              <th className="pb-2 font-medium text-right">Available</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {books.map((book) => (
              <tr key={book.id}>
                <td className="py-3 pr-4 font-medium text-gray-900">{book.title}</td>
                <td className="py-3 pr-4 text-gray-600">{book.author}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{book.totalCopies}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{book.availableCopies}</td>
                <td className="py-3 flex items-center justify-end gap-3">
                  <Link
                    href={`/staff/books/${book.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteBookButton id={book.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
