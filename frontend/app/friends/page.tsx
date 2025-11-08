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

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFriends();
    fetchPendingRequests();
    fetchSentRequests();
  }, [user]);

  const fetchFriends = async () => {
    const { data } = await supabase
      .from("friends")
      .select("friend_id, profiles!friends_friend_id_fkey(username, id)")
      .eq("user_id", user.id)
      .eq("status", "accepted");
    setFriends(data?.map((f) => f.profiles) || []);
  };

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from("friends")
      .select("id, user_id, profiles!friends_user_id_fkey(username, id)")
      .eq("friend_id", user.id)
      .eq("status", "pending");
    setPendingRequests(data || []);
  };

  const fetchSentRequests = async () => {
    const { data } = await supabase
      .from("friends")
      .select("id, friend_id, profiles!friends_friend_id_fkey(username, id)")
      .eq("user_id", user.id)
      .eq("status", "pending");
    setSentRequests(data || []);
  };

  const searchUsers = async () => {
    if (!search.trim()) return setResults([]);
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${search}%`)
      .neq("id", user.id);
    setResults(data || []);
  };

  const sendRequest = async (friendId: string) => {
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: friendId, status: "pending" },
    ]);
    fetchSentRequests();
  };

  const acceptRequest = async (id: string, senderId: string) => {
    await supabase.from("friends").update({ status: "accepted" }).eq("id", id);
    await supabase.from("friends").insert([
      { user_id: user.id, friend_id: senderId, status: "accepted" },
    ]);
    fetchPendingRequests();
    fetchFriends();
  };

  const declineRequest = async (id: string) => {
    await supabase.from("friends").delete().eq("id", id);
    fetchPendingRequests();
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
            <div key={f.id} className="py-2 border-b">
              {f.username}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
