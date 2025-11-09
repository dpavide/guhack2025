"use client";

import { useState, useEffect } from "react";
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
    const loadFriendRequests = () => {
      const storedRequests = localStorage.getItem('friendRequests');
      if (storedRequests) {
        try {
          const requests = JSON.parse(storedRequests);
          const notificationsList = requests.map((request: any) => ({
            id: request.id,
            type: 'FRIEND_REQUEST',
            title: 'Friend Request',
            description: `${request.senderName} wants to be your friend`,
            status: 'unread',
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

    // Listen for changes in friend requests
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'friendRequests') {
        loadFriendRequests();
      }
    };

    const handleFriendRequestsUpdate = (e: CustomEvent) => {
      const requests = e.detail;
      if (Array.isArray(requests)) {
        const notificationsList = requests.map(request => ({
          id: request.id,
          type: 'FRIEND_REQUEST' as const,
          title: 'Friend Request',
          description: `${request.senderName} wants to be your friend`,
          status: 'unread' as const,
          timestamp: request.timestamp,
          senderId: request.senderId,
          senderName: request.senderName
        }));
        setNotifications(notificationsList);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('friendRequestsUpdated', handleFriendRequestsUpdate as EventListener);
    
    return () => {
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
                              onClick={() => markAsRead(notification.id)}
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