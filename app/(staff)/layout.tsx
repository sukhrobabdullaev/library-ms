import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavBar from "@/components/NavBar";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "student") redirect("/student/dashboard");

  return (
    <div className="min-h-full flex flex-col">
      <NavBar role={user.role} name={user.name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
