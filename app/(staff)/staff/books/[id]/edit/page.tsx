import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import BookForm from "@/components/BookForm";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book) notFound();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Book</h1>
      <BookForm
        bookId={book.id}
        initialValues={{
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? "",
          totalCopies: book.totalCopies,
        }}
      />
    </div>
  );
}
