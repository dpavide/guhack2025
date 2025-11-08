"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isAuthPage && (
        <nav className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Splitr</h1>
          <div className="flex gap-6 items-center">
            <Link href="/dashboard" className="hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/bills" className="hover:text-indigo-600">
              Bills
            </Link>
            <Link href="/redeem" className="hover:text-indigo-600">
              Redeem
            </Link>
            <Link href="/profile" className="hover:text-indigo-600">
              Profile
            </Link>
            <button onClick={handleLogout} className="text-red-600 hover:text-red-700">
              Logout
            </button>
          </div>
        </nav>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}
