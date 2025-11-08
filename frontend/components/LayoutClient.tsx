"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/" || pathname === "/login";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isAuthPage && (
        <nav className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Housr</h1>
          <div className="flex gap-6">
            <Link href="/dashboard" className="hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/bills" className="hover:text-indigo-600">
              Bills
            </Link>
            <Link href="/redeem" className="hover:text-indigo-600">
              Redeem
            </Link>
          </div>
        </nav>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}
