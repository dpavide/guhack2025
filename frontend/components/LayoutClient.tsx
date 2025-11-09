"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  User,
  Inbox,
  LogOut,
} from "lucide-react";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/" || pathname === "/login";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Icon class: margin only appears when text is visible (md screen and up)
  const iconClass = "w-5 h-5 md:mr-1";
  // Link class: minimal padding on small screens, no explicit gap
  const linkClass = "flex items-center hover:text-indigo-600 transition-colors duration-150 p-1 md:p-0";
  // Text class: Hide by default, show from 'md' (768px) and up
  const textClass = "hidden md:inline";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isAuthPage && (
        <nav className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold text-indigo-600">Splitr</h1>
          {/*
            KEY CHANGE: 
            1. Using 'flex-nowrap' to prevent links from wrapping onto a new line entirely.
            2. Using 'justify-end' to pack links tightly on small screens.
            3. Using 'md:gap-6' to add spacing only when the text is visible.
          */}
          <div className="flex items-center justify-end flex-nowrap min-w-0 md:gap-6 overflow-x-auto">
            
            <Link href="/dashboard" className={linkClass}>
              <LayoutDashboard className={iconClass} />
              <span className={textClass}>Dashboard</span>
            </Link>
            
            <Link href="/bills" className={linkClass}>
              <FileText className={iconClass} />
              <span className={textClass}>Bills</span>
            </Link>
            
            <Link href="/friends" className={linkClass}>
              <Users className={iconClass} />
              <span className={textClass}>Friends</span>
            </Link>
            
            <Link href="/redeem" className={linkClass}>
              <Wallet className={iconClass} />
              <span className={textClass}>Redeem</span>
            </Link>
            
            <Link href="/profile" className={linkClass}>
              <User className={iconClass} />
              <span className={textClass}>Profile</span>
            </Link>
            
            <Link href="/inbox" className={linkClass}>
              <Inbox className={iconClass} />
              <span className={textClass}>Inbox</span>
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="text-red-600 hover:text-red-700 flex items-center transition-colors duration-150 p-1 md:p-0"
            >
              <LogOut className={iconClass} />
              <span className={textClass}>Logout</span>
            </button>
          </div>
        </nav>
      )}
      <main className="p-6">{children}</main>
    </div>
  );
}