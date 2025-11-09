"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  email?: string | null;
  credits?: number | null;
  created_at?: string | null;
};

export default function FriendsPage() {
  const [user, setUser] = useState<any>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    };
    getUser();
  }, []);

  // Fetch when user ready
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests()]).finally(() =>
      setLoading(false)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- Helpers that avoid join syntax and instead use .in() ---

  // Fetch accepted friends (two-step: friend rows -> profiles)
  const fetchFriends = async () => {
    try {
      const { data: friendRows, error: friendError } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (friendError) {
        console.error("Error fetching friend rows:", friendError);
        setFriends([]);
        return;
      }

      const friendIds = (friendRows || []).map((r: any) => r.friend_id).filter(Boolean);
      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, first_name, last_name, bio, email, credits, created_at")
        .in("id", friendIds);

      if (profilesError) {
        console.error("Error fetching friend profiles:", profilesError);
        setFriends([]);
        return;
      }

      setFriends(profiles || []);
    } catch (e) {
      console.error("Unexpected error in fetchFriends:", e);
      setFriends([]);
    }
  };

  // Fetch incoming pending requests (rows where friend_id = me), then get sender profiles
  const fetchPendingRequests = async () => {
    try {
      const { data: rows, error } = await supabase
        .from("friends")
        .select("id, user_id, created_at")
        .eq("friend_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching pending friend rows:", error);
        setPendingRequests([]);
        return;
      }

      if (!rows || rows.length === 0) {
        setPendingRequests([]);
        // clear localStorage/inbox if needed
        localStorage.setItem("friendRequests", JSON.stringify([]));
        window.dispatchEvent(new CustomEvent("friendRequestsUpdated", { detail: [] }));
        return;
      }

      const senderIds = rows.map((r: any) => r.user_id).filter(Boolean);

      const { data: senders, error: sendersError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, first_name, last_name")
        .in("id", senderIds);

      if (sendersError) {
        console.error("Error fetching pending sender profiles:", sendersError);
        setPendingRequests([]);
        return;
      }

      // Map rows to include profile info
      const normalized = rows.map((r: any) => {
        const profile = (senders || []).find((s: any) => s.id === r.user_id) ?? null;
        return { ...r, profiles: profile };
      });

      setPendingRequests(normalized);

      // Sync to localStorage for inbox notifications
      const friendRequests = normalized.map((req) => ({
        id: req.id,
        senderId: req.user_id,
        senderName: req.profiles?.username ?? null,
        timestamp: req.created_at ?? new Date().toISOString(),
      }));
      localStorage.setItem("friendRequests", JSON.stringify(friendRequests));
      window.dispatchEvent(new CustomEvent("friendRequestsUpdated", { detail: friendRequests }));
    } catch (e) {
      console.error("Unexpected error in fetchPendingRequests:", e);
      setPendingRequests([]);
    }
  };

  // Fetch sent requests (rows where user_id = me), then get target profiles
  const fetchSentRequests = async () => {
    try {
      const { data: rows, error } = await supabase
        .from("friends")
        .select("id, friend_id, created_at")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (error) {
        console.error("Error fetching sent friend rows:", error);
        setSentRequests([]);
        return;
      }

      if (!rows || rows.length === 0) {
        setSentRequests([]);
        return;
      }

      const targetIds = rows.map((r: any) => r.friend_id).filter(Boolean);

      const { data: targets, error: targetsError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, first_name, last_name")
        .in("id", targetIds);

      if (targetsError) {
        console.error("Error fetching sent target profiles:", targetsError);
        setSentRequests([]);
        return;
      }

      const normalized = rows.map((r: any) => {
        const profile = (targets || []).find((t: any) => t.id === r.friend_id) ?? null;
        return { ...r, profiles: profile };
      });

      setSentRequests(normalized);
    } catch (e) {
      console.error("Unexpected error in fetchSentRequests:", e);
      setSentRequests([]);
    }
  };

  // Search users
  const searchUsers = async () => {
    if (!search.trim()) return setResults([]);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, first_name, last_name")
      .ilike("username", `%${search}%`)
      .neq("id", user.id);

    if (error) {
      console.error("Error searching profiles:", error);
      setResults([]);
      return;
    }
    setResults(data || []);
  };

  // Send friend request
  const sendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase.from("friends").insert([
        { user_id: user.id, friend_id: friendId, status: "pending" },
      ]);
      if (error) throw error;
      await fetchSentRequests();
      alert("Friend request sent");
    } catch (e: any) {
      console.error("Error sending request:", e);
      alert(e?.message || "Failed to send request");
    }
  };

  // Accept friend request
  const acceptRequest = async (id: string, senderId: string) => {
    try {
      const { error: updErr } = await supabase.from("friends").update({ status: "accepted" }).eq("id", id);
      if (updErr) throw updErr;

      // create reciprocal accepted row if not exists
      const { error: insErr } = await supabase.from("friends").insert([
        { user_id: user.id, friend_id: senderId, status: "accepted" },
      ]);
      if (insErr && !/duplicate key/.test(insErr.message || "")) throw insErr;

      // update local cache & UI
      await fetchPendingRequests();
      await fetchFriends();
      alert("Friend request accepted");
    } catch (e: any) {
      console.error("Error accepting request:", e);
      alert(e?.message || "Failed to accept request");
    }
  };

  // Decline friend request
  const declineRequest = async (id: string) => {
    try {
      const { error } = await supabase.from("friends").delete().eq("id", id);
      if (error) throw error;
      await fetchPendingRequests();
      alert("Friend request declined");
    } catch (e: any) {
      console.error("Error declining request:", e);
      alert(e?.message || "Failed to decline request");
    }
  };

  // Remove friend (both sides)
  const removeFriend = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from("friends")
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        );
      if (error) throw error;
      await fetchFriends();
      alert("Friend removed");
    } catch (e: any) {
      console.error("Error removing friend:", e);
      alert(e?.message || "Failed to remove friend");
    }
  };

  if (!user) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-600">Loading user...</p>
      </div>
    );
  }

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
              const alreadySent = sentRequests.find((req) => req.profiles?.id === r.id);
              const alreadyFriend = friends.find((f) => f.id === r.id);
              return (
                <div key={r.id} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <img src={r.avatar_url || "/default-avatar.png"} className="w-8 h-8 rounded-full" alt={r.username} />
                    <div>
                      <div className="font-medium">{r.username}</div>
                      <div className="text-xs text-gray-500">{(r.first_name || "") + (r.last_name ? ` ${r.last_name}` : "")}</div>
                    </div>
                  </div>

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
            <div key={req.id} className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <img src={req.profiles?.avatar_url || "/default-avatar.png"} className="w-8 h-8 rounded-full" alt={req.profiles?.username} />
                <div>
                  <div className="font-medium">{req.profiles?.username}</div>
                  <div className="text-xs text-gray-500">{req.profiles?.first_name ?? ""} {req.profiles?.last_name ?? ""}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => acceptRequest(req.id, req.user_id)}>Accept</Button>
                <Button variant="destructive" onClick={() => declineRequest(req.id)}>Decline</Button>
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
            <div key={f.id} className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <img src={f.avatar_url || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" alt={f.username} />
                <div>
                  <div className="font-medium">{f.username}</div>
                  <div className="text-xs text-gray-500">{(f.first_name ?? "") + (f.last_name ? ` ${f.last_name}` : "")}</div>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => removeFriend(f.id)}>Remove</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
