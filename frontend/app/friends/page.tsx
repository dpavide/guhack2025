"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  username: string;
}

export default function FriendsPage() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  // Fetch data when user changes
  useEffect(() => {
    if (!user) return;
    fetchFriends();
    fetchPendingRequests();
    fetchSentRequests();
  }, [user]);

  // Fetch accepted friends
  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("friend_id, profiles!friends_friend_id_fkey(username, id)")
      .eq("user_id", user.id)
      .eq("status", "accepted");

    if (error) {
      console.error("Error fetching friends:", error);
      setFriends([]);
      return;
    }

    // Supabase may return the joined `profiles` as an array (even when single)
    // normalize to always use the first element or the object itself.
    const normalized = (data || []).map((f: any) => {
      const p = f?.profiles;
      return Array.isArray(p) ? p[0] : p;
    }).filter(Boolean) as Profile[];

    setFriends(normalized);
  };

  // Fetch received requests
  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("id, user_id, profiles!friends_user_id_fkey(username, id)")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching pending friend requests:", error);
      setPendingRequests([]);
      return;
    }

    const normalized = (data || []).map((r: any) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    }));

    setPendingRequests(normalized);

    // Sync to localStorage for inbox notifications
    const friendRequests = normalized.map(req => ({
      id: req.id,
      senderId: req.user_id,
      senderName: req.profiles.username,
      timestamp: new Date().toISOString()
    }));
    localStorage.setItem('friendRequests', JSON.stringify(friendRequests));
    
    // Dispatch event to notify inbox
    window.dispatchEvent(new CustomEvent('friendRequestsUpdated', {
      detail: friendRequests
    }));
  };

  // Fetch sent requests
  const fetchSentRequests = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("id, friend_id, profiles!friends_friend_id_fkey(username, id)")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) {
      console.error("Error fetching sent friend requests:", error);
      setSentRequests([]);
      return;
    }

    const normalized = (data || []).map((r: any) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
    }));

    setSentRequests(normalized);
  };

  // Search for users
  const searchUsers = async () => {
    if (!search.trim()) return setResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${search}%`)
      .neq("id", user.id);
    setResults(data || []);
  };

  // Send friend request
  const sendRequest = async (friendId: string) => {
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: friendId, status: "pending" },
    ]);
    fetchSentRequests();
  };

  // Accept friend request
  const acceptRequest = async (id: string, senderId: string) => {
    await supabase.from("friends").update({ status: "accepted" }).eq("id", id);
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: senderId, status: "accepted" },
    ]);
    
    // Update localStorage and notify inbox
    const storedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    const updatedRequests = storedRequests.filter((req: any) => req.id !== id);
    localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
    window.dispatchEvent(new CustomEvent('friendRequestsUpdated', {
      detail: updatedRequests
    }));

    fetchPendingRequests();
    fetchFriends();
  };

  // Decline friend request
  const declineRequest = async (id: string) => {
    await supabase.from("friends").delete().eq("id", id);
    
    // Update localStorage and notify inbox
    const storedRequests = JSON.parse(localStorage.getItem('friendRequests') || '[]');
    const updatedRequests = storedRequests.filter((req: any) => req.id !== id);
    localStorage.setItem('friendRequests', JSON.stringify(updatedRequests));
    window.dispatchEvent(new CustomEvent('friendRequestsUpdated', {
      detail: updatedRequests
    }));

    fetchPendingRequests();
  };

  // Remove friend (both sides)
  const removeFriend = async (friendId: string) => {
    await supabase
      .from("friends")
      .delete()
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
    fetchFriends();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Find Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search username..."
              className="border rounded px-3 py-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={searchUsers}>Search</Button>
          </div>

          {results.length > 0 &&
            results.map((r) => {
              const alreadySent = sentRequests.find(
                (req) => req.profiles.id === r.id
              );
              const alreadyFriend = friends.find((f) => f.id === r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b"
                >
                  <span>{r.username}</span>
                  {alreadyFriend ? (
                    <span className="text-green-500">Friend</span>
                  ) : alreadySent ? (
                    <span className="text-yellow-500">Pending</span>
                  ) : (
                    <Button onClick={() => sendRequest(r.id)}>Add</Button>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Friend Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 && <p>No pending requests</p>}
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between py-2 border-b"
            >
              <span>{req.profiles.username}</span>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => acceptRequest(req.id, req.user_id)}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => declineRequest(req.id)}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Friends</CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 && <p>No friends yet</p>}
          {friends.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between py-2 border-b"
            >
              <span>{f.username}</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeFriend(f.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
