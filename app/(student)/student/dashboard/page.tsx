import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

export default async function StudentDashboard() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome, {user?.name}.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/catalog"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">Browse Catalog</p>
          <p className="text-sm text-gray-500 mt-1">Search and find books</p>
        </Link>
        <Link
          href="/student/loans"
          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
        >
          <p className="font-medium text-gray-900">My Loans</p>
          <p className="text-sm text-gray-500 mt-1">View active loans and history</p>
        </Link>
      </div>
    </div>
  );
}
