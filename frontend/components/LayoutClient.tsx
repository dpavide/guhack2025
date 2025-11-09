"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
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

  // Friend request count for Inbox badge
  const [friendRequestCount, setFriendRequestCount] = useState<number>(0);

  useEffect(() => {
    const loadCount = () => {
      try {
        const raw = localStorage.getItem("friendRequests");
        if (!raw) return setFriendRequestCount(0);
        const parsed = JSON.parse(raw);
        setFriendRequestCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch (e) {
        console.error("Failed to read friendRequests from localStorage", e);
        setFriendRequestCount(0);
      }
    };

    loadCount();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "friendRequests") loadCount();
    };

    const onCustom = (ev: any) => {
      const detail = ev?.detail;
      if (Array.isArray(detail)) setFriendRequestCount(detail.length);
      else loadCount();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("friendRequestsUpdated", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("friendRequestsUpdated", onCustom as EventListener);
    };
  }, []);

  // Icon class: margin only appears when text is visible (md screen and up)
  const iconClass = "w-5 h-5 md:mr-1";
  // Link class: minimal padding on small screens, no explicit gap
  const linkClass = "flex items-center hover:text-indigo-600 transition-colors duration-150 p-1 md:p-0 mt-1";
  // Text class: Hide by default, show from 'md' (768px) and up
  const textClass = "hidden md:inline";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isAuthPage && (
  // Make nav background transparent so badges are not visually clipped by a white bar
  // Remove sticky so header scrolls away with the page
  <nav className="bg-transparent p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Splitr</h1>
          {/*
            KEY CHANGE: 
            1. Using 'flex-nowrap' to prevent links from wrapping onto a new line entirely.
            2. Using 'justify-end' to pack links tightly on small screens.
            3. Using 'md:gap-6' to add spacing only when the text is visible.
          */}
          <div className="flex items-center justify-end flex-nowrap min-w-0 md:gap-6 overflow-x-auto overflow-y-visible">
            
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
              <div className="relative">
                <Inbox className={iconClass} />
                {friendRequestCount > 0 && (
                  <span
                    className="absolute right-0 min-w-3 h-3 px-1 text-[9px] leading-3 flex items-center justify-center bg-red-500 text-white rounded-full ring-2 ring-white z-50"
                    style={{ top: 0, transform: 'translate(50%, -50%)' }}
                  >
                    {friendRequestCount > 9 ? "9+" : friendRequestCount}
                  </span>
                )}
              </div>
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