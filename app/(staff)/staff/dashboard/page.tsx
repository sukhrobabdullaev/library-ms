import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function StaffDashboard() {
  const user = await getCurrentUser();
  const label = user?.role === "manager" ? "Manager" : "Librarian";

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome, {user?.name} ({label}).</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/catalog"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">Catalog</p>
          <p className="text-sm text-gray-500 mt-1">Browse all books</p>
        </Link>
        <Link
          href="/staff/books"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">Manage Books</p>
          <p className="text-sm text-gray-500 mt-1">Add, edit, remove books</p>
        </Link>
        <Link
          href="/staff/loans"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">Loans Desk</p>
          <p className="text-sm text-gray-500 mt-1">Borrow and return on behalf of students</p>
        </Link>
        <Link
          href="/staff/reports"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">Reports</p>
          <p className="text-sm text-gray-500 mt-1">Overdue loans and popular books</p>
        </Link>
        {user?.role === "manager" && (
          <Link
            href="/staff/rules"
            className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
          >
            <p className="font-medium text-gray-900">Borrowing Rules</p>
            <p className="text-sm text-gray-500 mt-1">Edit loan period, limits, and fines</p>
          </Link>
        )}
      </div>
    </div>
  );
}
