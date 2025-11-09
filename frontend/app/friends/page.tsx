"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Check, X, UserMinus, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";

type Profile = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
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
  const [activeFriend, setActiveFriend] = useState<string | null>(null);

  /** ---------- Load user ---------- **/
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
    };
    getUser();
  }, []);

  /** ---------- Load data when user is ready ---------- **/
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchFriends(), fetchPendingRequests(), fetchSentRequests()]).finally(() =>
      setLoading(false)
    );
  }, [user]);

  /** ---------- Fetch Friends (bidirectional) ---------- **/
  const fetchFriends = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq("status", "accepted");

    if (error) return console.error(error);

    const ids =
      data
        ?.map((f: any) => (f.user_id === user.id ? f.friend_id : f.user_id))
        ?.filter((id: string) => id !== user.id) ?? [];

    if (ids.length === 0) return setFriends([]);

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url, bio, created_at")
      .in("id", ids);

    if (profileError) return console.error(profileError);
    setFriends(profiles ?? []);
  };

  /** ---------- Fetch pending requests ---------- **/
  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("id, user_id, created_at")
      .eq("friend_id", user.id)
      .eq("status", "pending");

    if (error) return console.error(error);
    if (!data?.length) {
      setPendingRequests([]);
      localStorage.setItem("friendRequests", JSON.stringify([]));
      window.dispatchEvent(new CustomEvent("friendRequestsUpdated", { detail: [] }));
      return;
    }

    const senderIds = data.map((r: any) => r.user_id);
    const { data: senders } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url")
      .in("id", senderIds);

    const merged = data.map((r: any) => ({
      ...r,
      profile: senders?.find((s) => s.id === r.user_id),
    }));
    setPendingRequests(merged);

    try {
      const friendRequests = merged.map((req: any) => ({
        id: req.id,
        senderId: req.user_id,
        senderName: req.profile?.username || req.user_id,
        timestamp: req.created_at || new Date().toISOString(),
      }));

      localStorage.setItem("friendRequests", JSON.stringify(friendRequests));
      window.dispatchEvent(new CustomEvent("friendRequestsUpdated", { detail: friendRequests }));
    } catch (err) {
      console.error("Failed to sync friendRequests to localStorage", err);
    }
  };

  /** ---------- Fetch sent requests ---------- **/
  const fetchSentRequests = async () => {
    const { data, error } = await supabase
      .from("friends")
      .select("friend_id, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending");

    if (error) return console.error(error);
    if (!data?.length) return setSentRequests([]);

    const targetIds = data.map((r: any) => r.friend_id);
    const { data: targets } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url")
      .in("id", targetIds);

    setSentRequests(targets ?? []);
  };

  /** ---------- Search users ---------- **/
  const searchUsers = async () => {
    if (!search.trim()) return setResults([]);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, avatar_url")
      .ilike("username", `%${search}%`)
      .neq("id", user.id);

    if (error) return console.error(error);
    setResults(data ?? []);
  };

  /** ---------- Friend Actions ---------- **/
  const sendRequest = async (friendId: string) => {
    await supabase.from("friends").insert([{ user_id: user.id, friend_id: friendId, status: "pending" }]);
    await fetchSentRequests();
    alert("Friend request sent!");
  };

  const acceptRequest = async (id: string, senderId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", id);
      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from("friends")
        .insert([{ user_id: user.id, friend_id: senderId, status: "accepted" }]);
      if (insertError) throw insertError;

      const storedRequests = JSON.parse(localStorage.getItem("friendRequests") || "[]");
      const updatedRequests = storedRequests.filter((req: any) => req.id !== id);
      localStorage.setItem("friendRequests", JSON.stringify(updatedRequests));
      window.dispatchEvent(new CustomEvent("friendRequestsUpdated", { detail: updatedRequests }));

      await fetchPendingRequests();
      await fetchFriends();
    } catch (err) {
      console.error("Error accepting friend request:", err);
    }
  };

  const declineRequest = async (id: string) => {
    await supabase.from("friends").delete().eq("id", id);
    await fetchPendingRequests();
  };

  const removeFriend = async (friendId: string) => {
    await supabase
      .from("friends")
      .delete()
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
      );
    await fetchFriends();
  };

  /** ---------- Helpers ---------- **/
  const getDaysSinceJoined = (date?: string | null) => {
    if (!date) return null;
    const diff = dayjs().diff(dayjs(date), "day");
    return diff;
  };

  /** ---------- Render Avatar ---------- **/
  const renderAvatar = (profile?: Profile | null) => {
    if (profile?.avatar_url) {
      return (
        <div className="w-16 h-16 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg shrink-0">
          <Image
            src={profile.avatar_url}
            alt={profile.username || "avatar"}
            width={128}
            height={128}
            className="object-cover w-full h-full rounded-full"
          />
        </div>
      );
    }

    const letter = (profile?.first_name || profile?.username || "?")[0]?.toUpperCase() || "?";
    return (
      <div className="w-16 h-16 flex items-center justify-center rounded-full border-4 border-white bg-linear-to-br from-slate-700 to-slate-900 text-white text-3xl font-bold shadow-lg shrink-0">
        {letter}
      </div>
    );
  };

  /** ---------- Loading State ---------- **/
  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-600">
        Loading friends...
      </div>
    );

  /** ---------- UI ---------- **/
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* 🔍 Search Section */}
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
              const alreadyFriend = friends.some((f) => f.id === r.id);
              const alreadySent = sentRequests.some((s) => s.id === r.id);

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {renderAvatar(r)}
                    <div>
                      <p className="font-medium">{(r.first_name ?? "") + (r.last_name ? ` ${r.last_name}` : "")}</p>
                      <p className="text-xs text-gray-500">
                        {"@" + r.username}
                      </p>
                    </div>
                  </div>

                  {alreadyFriend ? (
                    <span className="text-green-500 text-sm">Friend</span>
                  ) : alreadySent ? (
                    <span className="text-yellow-500 text-sm">Pending</span>
                  ) : (
                    <Button size="sm" onClick={() => sendRequest(r.id)}>
                      <UserPlus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* 🕓 Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Friend Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-sm">No pending requests</p>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between py-2 border-b hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(req.profile)}
                  <div>
                    <p className="font-medium">{req.profile?.username}</p>
                    <p className="text-xs text-gray-500">
                      {(req.profile?.first_name ?? "") +
                        (req.profile?.last_name ? ` ${req.profile?.last_name}` : "")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptRequest(req.id, req.user_id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineRequest(req.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 🧑‍🤝‍🧑 Friends List with hover/tap popup */}
      <Card>
        <CardHeader>
          <CardTitle>Your Friends</CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-gray-500 text-sm">You have no friends yet.</p>
          ) : (
            friends.map((f) => (
              <div
                key={f.id}
                className="relative flex items-center justify-between py-2 border-b hover:bg-gray-50 transition-all cursor-pointer"
                onMouseEnter={() => setActiveFriend(f.id)}
                onMouseLeave={() => setActiveFriend(null)}
                onClick={() => setActiveFriend((prev) => (prev === f.id ? null : f.id))}
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(f)}
                  <div>
                    <p className="font-medium">{(f.first_name ?? "") + (f.last_name ? ` ${f.last_name}` : "")}</p>
                    <p className="text-xs text-gray-500">
                      {"@" + f.username}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFriend(f.id);
                  }}
                  className="hover:text-red-600 hover:border-red-600"
                >
                  <UserMinus className="w-4 h-4 mr-1" /> Remove
                </Button>

                {/* 🪄 Friend Info Popup (next to user avatar) */}
                <AnimatePresence>
                {activeFriend === f.id && (
                    <motion.div
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-16 top-1/2 -translate-y-1/2 w-64 bg-white shadow-lg rounded-xl border border-gray-200 p-3 z-50"
                    >
                    <p className="font-semibold text-gray-800">
                        {f.first_name} {f.last_name}
                    </p>
                    <p className="text-sm text-gray-600 italic">{f.bio || "No bio yet"}</p>
                    {f.created_at && (
                        <p className="text-xs text-gray-500 mt-1">
                        Joined {getDaysSinceJoined(f.created_at)} days ago
                        </p>
                    )}
                    </motion.div>
                )}
                </AnimatePresence>


              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
