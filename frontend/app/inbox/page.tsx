"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: 'SPLIT_PAYMENT' | 'FRIEND_REQUEST';
  title: string;
  description: string;
  status: 'unread' | 'read';
  timestamp: string;
  senderId?: string;
  senderName?: string;
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load friend requests from localStorage
  useEffect(() => {
    const loadFriendRequests = async () => {
      // load dismissed ids so dismissed notifications remain hidden
      let dismissedIds: string[] = [];
      try {
        const rawDismissed = localStorage.getItem('dismissedNotifications');
        dismissedIds = rawDismissed ? JSON.parse(rawDismissed) : [];
      } catch (e) {
        dismissedIds = [];
      }
      // Prefer live data from Supabase if user is logged in
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user ?? null;
        if (user) {
          const { data, error } = await supabase
            .from('friends')
            .select('id, user_id, created_at')
            .eq('friend_id', user.id)
            .eq('status', 'pending');

          if (!error && data) {
            // Fetch sender profiles
            const senderIds = data.map((r: any) => r.user_id);
            const { data: senders } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', senderIds);

            const requests = data.map((r: any) => ({
              id: r.id,
              senderId: r.user_id,
              senderName: senders?.find((s: any) => s.id === r.user_id)?.username || r.user_id,
              timestamp: r.created_at || new Date().toISOString(),
            }));

            const notificationsList = requests
              .filter((r: any) => !dismissedIds.includes(r.id))
              .map((request: any) => ({
              id: request.id,
              type: 'FRIEND_REQUEST' as const,
              title: 'Friend Request',
              description: `${request.senderName} wants to be your friend`,
              status: 'unread' as const,
              timestamp: request.timestamp,
              senderId: request.senderId,
              senderName: request.senderName,
            }));

            setNotifications(notificationsList);

            // also persist to localStorage so other tabs/components can read
            localStorage.setItem('friendRequests', JSON.stringify(requests));
            window.dispatchEvent(new CustomEvent('friendRequestsUpdated', { detail: requests }));
            return;
          }
        }
      } catch (err) {
        console.error('Error loading friend requests from supabase', err);
      }

      // Fallback to localStorage if supabase not available or user not logged in
      const storedRequests = localStorage.getItem('friendRequests');
      if (storedRequests) {
        try {
          const requests = JSON.parse(storedRequests);
          const rawDismissed = localStorage.getItem('dismissedNotifications');
          const dismissed = rawDismissed ? JSON.parse(rawDismissed) : [];
          const notificationsList = requests
            .filter((r: any) => !dismissed.includes(r.id))
            .map((request: any) => ({
            id: request.id,
            type: 'FRIEND_REQUEST' as const,
            title: 'Friend Request',
            description: `${request.senderName} wants to be your friend`,
            status: 'unread' as const,
            timestamp: request.timestamp || new Date().toISOString(),
            senderId: request.senderId,
            senderName: request.senderName
          }));
          setNotifications(notificationsList);
        } catch (err) {
          console.error('Error parsing friend requests:', err);
        }
      }
    };

    loadFriendRequests();

    // Poll for updates periodically while inbox is open (helps when other user sends request)
    const interval = setInterval(() => {
      loadFriendRequests();
    }, 15000);

    // Listen for changes in friend requests via localStorage or custom event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'friendRequests') {
        loadFriendRequests();
      }
    };

    const handleFriendRequestsUpdate = (e: any) => {
      const requests = e?.detail;
      if (Array.isArray(requests)) {
        try {
          const raw = localStorage.getItem('dismissedNotifications');
          const dismissed = raw ? JSON.parse(raw) : [];
          const notificationsList = requests
            .filter((r: any) => !dismissed.includes(r.id))
            .map((request: any) => ({
              id: request.id,
              type: 'FRIEND_REQUEST' as const,
              title: 'Friend Request',
              description: `${request.senderName} wants to be your friend`,
              status: 'unread' as const,
              timestamp: request.timestamp,
              senderId: request.user_id || request.senderId,
              senderName: request.senderName
            }));
          setNotifications(notificationsList);
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('friendRequestsUpdated', handleFriendRequestsUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('friendRequestsUpdated', handleFriendRequestsUpdate as EventListener);
    };
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, status: 'read' } 
        : notification
    ));
  };

  // Persist a dismissal without removing the underlying friend request
  const persistDismiss = (notificationId: string) => {
    try {
      const raw = localStorage.getItem('dismissedNotifications');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(notificationId)) {
        arr.push(notificationId);
        localStorage.setItem('dismissedNotifications', JSON.stringify(arr));
      }
      // notify other tabs/components that dismissed list changed
      window.dispatchEvent(new CustomEvent('dismissedNotificationsUpdated', { detail: arr }));
    } catch (e) {
      console.error('Failed to persist dismissed notification', e);
    }
  };

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
                        {notification.type === 'FRIEND_REQUEST' ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                markAsRead(notification.id);
                                window.location.href = '/friends';
                              }}
                            >
                              View in Friends
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => {
                                // persist dismissal and remove from UI; do not delete friendRequests
                                persistDismiss(notification.id);
                                setNotifications(prev => prev.filter(n => n.id !== notification.id));
                              }}
                            >
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Decline
                            </Button>
                          </>
                        )}
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