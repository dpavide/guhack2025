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
    // ❗️ ADDED: Clear the count on logout so it doesn't persist for the next user
    localStorage.removeItem('unreadNotificationCount');
    router.push("/");
  };

  // 1. ❗️ RENAMED: from friendRequestCount to unreadCount for clarity
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 2. ❗️ REPLACED: This useEffect now listens for the global count
  useEffect(() => {
    // 1. Set the initial count from localStorage on load
    const initialCount = parseInt(localStorage.getItem('unreadNotificationCount') || '0', 10);
    setUnreadCount(initialCount);

    // 2. Define the listener for the custom event from InboxPage
    const handleNotificationsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setUnreadCount(customEvent.detail);
    };

    // 3. Listen for the custom event
    window.addEventListener('notifications-updated', handleNotificationsUpdate);

    // 4. Fallback: Also listen for storage changes (in case another tab updates)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'unreadNotificationCount') {
        setUnreadCount(parseInt(event.newValue || '0', 10));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 5. Clean up listeners
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Runs only once on mount

  // Icon class: margin only appears when text is visible (md screen and up)
  const iconClass = "w-5 h-5 md:mr-1";
  // Link class: minimal padding on small screens, no explicit gap
  const linkClass = "flex items-center hover:text-indigo-600 transition-colors duration-150 p-1 md:p-0 mt-1";
  // Text class: Hide by default, show from 'md' (768px) and up
  const textClass = "hidden md:inline";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {!isAuthPage && (
        <nav className="bg-transparent p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Splitr</h1>
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
            
            {/* 3. ❗️ UPDATED: This JSX now uses the 'unreadCount' state */}
            <Link href="/inbox" className={linkClass}>
              <div className="relative">
                <Inbox className={iconClass} />
                {unreadCount > 0 && (
                  <span
                    className="absolute right-0 min-w-3 h-3 px-1 text-[9px] leading-3 flex items-center justify-center bg-red-500 text-white rounded-full ring-2 ring-white z-50"
                    style={{ top: 0, transform: 'translate(50%, -50%)' }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
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