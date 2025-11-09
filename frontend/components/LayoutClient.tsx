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
  const isAuthPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ❗️ ADDED: Clear the count on logout so it doesn't persist for the next user
    localStorage.removeItem('unreadNotificationCount');
    router.push("/");
  };

  // 1. ❗️ RENAMED: from friendRequestCount to unreadCount for clarity
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // 2. ❗️ Load and calculate unread count on mount
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUnreadCount(0);
          return;
        }

        // Get dismissed notifications
        let dismissedIds: string[] = [];
        try {
          const rawDismissed = localStorage.getItem('dismissedNotifications');
          dismissedIds = rawDismissed ? JSON.parse(rawDismissed) : [];
        } catch (e) {
          dismissedIds = [];
        }

        // Fetch friend requests
        const { data: friendRequests, error: friendError } = await supabase
          .from('friends')
          .select('id')
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        // Fetch bill invitations
        const { data: billInvitations, error: billError } = await supabase
          .from('bill_participants')
          .select('id, bill:bills!inner(user_id)')
          .eq('user_id', user.id)
          .eq('has_paid', false);

        // Filter out dismissed and own bills
        const validFriendRequests = (friendRequests || []).filter(
          (r: any) => !dismissedIds.includes(r.id)
        );

        const validBillInvitations = (billInvitations || []).filter(
          (p: any) => !dismissedIds.includes(p.id) && p.bill?.user_id !== user.id
        );

        const totalCount = validFriendRequests.length + validBillInvitations.length;
        
        setUnreadCount(totalCount);
        localStorage.setItem('unreadNotificationCount', totalCount.toString());
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    // Load initial count
    loadUnreadCount();

    // Listen for updates from Inbox page
    const handleNotificationsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setUnreadCount(customEvent.detail);
    };

    window.addEventListener('notifications-updated', handleNotificationsUpdate);

    // Listen for storage changes (cross-tab sync)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'unreadNotificationCount') {
        setUnreadCount(parseInt(event.newValue || '0', 10));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Clean up listeners
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