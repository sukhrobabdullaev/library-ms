import Link from "next/link";
import { db } from "@/lib/db";
import CatalogSearch from "@/components/CatalogSearch";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  const books = await db.book.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { author: { contains: q, mode: "insensitive" } },
            { isbn: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { title: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Book Catalog</h1>
      <CatalogSearch initialQ={q} />

      {books.length === 0 ? (
        <p className="text-gray-500 mt-6">No books found.</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                href={`/catalog/${book.id}`}
                className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded"
              >
                <div>
                  <p className="font-medium text-gray-900">{book.title}</p>
                  <p className="text-sm text-gray-500">{book.author}</p>
                  {book.isbn && (
                    <p className="text-xs text-gray-400">ISBN: {book.isbn}</p>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    book.availableCopies > 0
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {book.availableCopies > 0
                    ? `${book.availableCopies} available`
                    : "Unavailable"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
