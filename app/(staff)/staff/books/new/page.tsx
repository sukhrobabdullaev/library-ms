import BookForm from "@/components/BookForm";

export default function NewBookPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Book</h1>
      <BookForm />
    </div>
  );
}
