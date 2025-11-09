"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

// --- (Interface) ---

interface Notification {
  id: string; 
  type: 'SPLIT_PAYMENT' | 'FRIEND_REQUEST';
  title: string;
  description: string;
  status: 'unread' | 'read';
  timestamp: string;
  senderId?: string;
  senderName?: string;
  href: string; 
}

// --- (Fetch Functions) ---

/**
 * Fetches pending bill split invitations from Supabase
 */
const fetchBillNotifications = async (userId: string, dismissedIds: string[]): Promise<Notification[]> => {
  // ❗️ THIS FUNCTION IS CORRECT, BUT WILL FAIL UNTIL YOU ADD THE
  // ❗️ FOREIGN KEY TO YOUR DATABASE (SEE ERROR #2 ABOVE)
  const { data, error } = await supabase
    .from('bill_participants')
    .select(`
      id,
      bill:bills (
        id,
        title,
        created_at,
        user_id,
        creator:profiles ( id, username )
      )
    `)
    .eq('user_id', userId)   
    .eq('has_paid', false); 

  if (error || !data) {
    console.error('Error fetching bill notifications:', error);
    return [];
  }

  const pendingBills = data.filter((p: any) => {
    const isNotDismissed = !dismissedIds.includes(p.id);
    const isNotMyOwnBill = p.bill?.creator?.id !== userId;
    const hasValidData = p.bill && p.bill.creator;
    return isNotDismissed && isNotMyOwnBill && hasValidData;
  });

  return pendingBills.map((p: any) => ({
    id: p.id,
    type: 'SPLIT_PAYMENT' as const,
    title: 'Bill Split Request',
    description: `${p.bill.creator.username} invited you to split "${p.bill.title}"`,
    status: 'unread' as const,
    timestamp: p.bill.created_at,
    senderId: p.bill.creator.id,
    senderName: p.bill.creator.username,
    href: '/bills'
  }));
};

/**
 * Fetches pending friend requests from Supabase
 */
const fetchFriendRequests = async (userId: string, dismissedIds: string[]): Promise<Notification[]> => {
  // ✅ FIX APPLIED HERE
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id, 
      user_id, 
      created_at, 
      profile:profiles!friends_user_id_fkey(id, username)
    `)
    .eq('friend_id', userId)
    .eq('status', 'pending');

  if (error || !data) {
    console.error('Error fetching friend requests:', error);
    return [];
  }

  return data
    .filter((r: any) => !dismissedIds.includes(r.id) && r.profile) // Added r.profile check
    .map((request: any) => ({
      id: request.id,
      type: 'FRIEND_REQUEST' as const,
      title: 'Friend Request',
      description: `${request.profile?.username || 'Someone'} wants to be your friend`,
      status: 'unread' as const,
      timestamp: request.created_at || new Date().toISOString(),
      senderId: request.user_id,
      senderName: request.profile?.username,
      href: '/friends'
    }));
};
  
export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // --- (Realtime useEffect) ---
  useEffect(() => {
    // 1. Define the function to load all notifications
    const loadAllNotifications = async (userId: string) => {
      let dismissedIds: string[] = [];
      try {
        const rawDismissed = localStorage.getItem('dismissedNotifications');
        dismissedIds = rawDismissed ? JSON.parse(rawDismissed) : [];
      } catch (e) { dismissedIds = []; }

      try {
        // Fetch both types of notifications in parallel
        const [friendRequests, billNotifications] = await Promise.all([
          fetchFriendRequests(userId, dismissedIds),
          fetchBillNotifications(userId, dismissedIds)
        ]);

        // Combine and sort all notifications by date
        const allNotifications = [...friendRequests, ...billNotifications];
        allNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setNotifications(allNotifications);
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    };

    // 2. Get the user and load initial data
    const initializeAndSubscribe = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;

      if (!user) {
        setNotifications([]);
        return;
      }

      console.log('Inbox: Initializing for user:', user.id);
      await loadAllNotifications(user.id);

      // --- 3. Set up Realtime Subscriptions WITH DEBUGGING ---
      
      const friendsChannel = supabase.channel('friend-notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'friends', 
          filter: `friend_id=eq.${user.id}` 
        }, 
        (payload) => {
          console.log('✅ New friend request received!', payload);
          loadAllNotifications(user.id);
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ SUBSCRIBED to friendsChannel');
          }
          if (status === 'CHANNEL_ERROR' || err) {
            console.error('🔴 FAILED to subscribe to friendsChannel:', err);
          }
        });

      const billsChannel = supabase.channel('bill-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'bill_participants',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('✅ New bill invitation received!', payload);
          loadAllNotifications(user.id);
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ SUBSCRIBED to billsChannel');
          }
          if (status === 'CHANNEL_ERROR' || err) {
            console.error('🔴 FAILED to subscribe to billsChannel:', err);
          }
        });

      // 4. Return cleanup function
      return () => {
        console.log('Inbox: Cleaning up channels');
        supabase.removeChannel(friendsChannel);
        supabase.removeChannel(billsChannel);
      };
    };

    const cleanupPromise = initializeAndSubscribe();

    // 5. Cleanup on component unmount
    return () => {
      cleanupPromise.then((cleanup) => {
        if (cleanup) {
          cleanup();
        }
      });
    };
  }, []); // Empty dependency array, runs once on mount


  // --- (Helper Functions) ---

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, status: 'read' } 
        : notification
    ));
  };

  const persistDismiss = (notificationId: string) => {
    try {
      const raw = localStorage.getItem('dismissedNotifications');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(notificationId)) {
        arr.push(notificationId);
        localStorage.setItem('dismissedNotifications', JSON.stringify(arr));
      }
      window.dispatchEvent(new CustomEvent('dismissedNotificationsUpdated', { detail: arr }));
    } catch (e) {
      console.error('Failed to persist dismissed notification', e);
    }
    
    // Also trigger an immediate UI update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  // --- (UI / JSX) ---
  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-8">
      <Card className="mb-8 shadow-lg bg-white/80 backdrop-blur-md border-blue-100">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex items-center gap-2">
            📬 Inbox
            {notifications.some(n => n.status === 'unread') && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                New
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No new notifications
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`relative hover:shadow-md transition-shadow ${
                    notification.status === 'unread' 
                      ? 'border-l-4 border-l-blue-500' 
                      : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {notification.title}
                          {notification.status === 'unread' && (
                            <span className="bg-red-500 w-2 h-2 rounded-full"/>
                          )}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {notification.description}
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link href={notification.href} passHref legacyBehavior>
                          <Button 
                            asChild 
                            variant="outline" 
                            size="sm"
                          >
                            <a>
                              {notification.type === 'FRIEND_REQUEST' ? 'View in Friends' : 'View in Bills'}
                            </a>
                          </Button>
                        </Link>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            persistDismiss(notification.id);
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}