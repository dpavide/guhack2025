"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: 'SPLIT_PAYMENT';
  title: string;
  description: string;
  status: 'unread' | 'read';
  timestamp: string;
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'SPLIT_PAYMENT',
      title: 'Split Payment Invitation',
      description: 'Alex invited you to split £30 for dinner',
      status: 'unread',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      type: 'SPLIT_PAYMENT',
      title: 'Split Payment Invitation',
      description: 'Sarah invited you to split £50 for movie tickets',
      status: 'read',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ]);

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