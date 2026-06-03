"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/app/generated/prisma/client";

export default function NavBar({ role, name }: { role: Role; name: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-6">
      <span className="font-bold text-gray-900">Library MS</span>

      <Link href="/catalog" className="text-sm text-gray-600 hover:text-gray-900">
        Catalog
      </Link>

      {role === "student" && (
        <Link href="/student/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
          My Loans
        </Link>
      )}

      {(role === "librarian" || role === "manager") && (
        <>
          <Link href="/staff/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/staff/books" className="text-sm text-gray-600 hover:text-gray-900">
            Books
          </Link>
          <Link href="/staff/loans" className="text-sm text-gray-600 hover:text-gray-900">
            Loans
          </Link>
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-500">{name}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
