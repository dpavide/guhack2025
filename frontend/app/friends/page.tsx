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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-lg font-medium"
          >
            Loading friends...
          </motion.p>
        </motion.div>
      </div>
    );

  /** ---------- UI ---------- **/
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 py-10"
    >
      <div className="mx-auto max-w-6xl px-4 space-y-10">
      {/* 🔍 Search Section */}
      <Card className="shadow-sm bg-white/80 backdrop-blur-md border border-indigo-100/60 rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight text-gray-800 flex items-center gap-2">
            <span>Find Friends</span>
            <span className="text-xs font-normal text-gray-400">Search & Add</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search username..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button onClick={searchUsers} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-sm">Search</Button>
          </div>

          {results.length > 0 &&
            results.map((r) => {
              const alreadyFriend = friends.some((f) => f.id === r.id);
              const alreadySent = sentRequests.some((s) => s.id === r.id);

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-indigo-50/50 transition-colors rounded-md px-2"
                >
                  <div className="flex items-center gap-3">
                    {renderAvatar(r)}
                    <div>
                      <p className="font-medium text-sm text-gray-800">{(r.first_name ?? "") + (r.last_name ? ` ${r.last_name}` : "")}</p>
                      <p className="text-xs text-gray-500">{"@" + r.username}</p>
                    </div>
                  </div>

                  {alreadyFriend ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-700">Friend</span>
                  ) : alreadySent ? (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                  ) : (
                    <Button size="sm" onClick={() => sendRequest(r.id)} className="rounded-md bg-green-600 hover:bg-green-700">
                      <UserPlus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* 🕓 Pending Requests */}
      <Card className="shadow-sm bg-white/80 backdrop-blur-md border border-indigo-100/60 rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight text-gray-800 flex items-center gap-2">
            <span>Pending Requests</span>
            <span className="text-xs font-normal text-gray-400">Approve or Decline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No pending requests</p>
          ) : (
            pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-indigo-50/50 transition-colors rounded-md px-2"
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(req.profile)}
                  <div>
                    <p className="font-medium text-sm text-gray-800">{req.profile?.username}</p>
                    <p className="text-xs text-gray-500">{(req.profile?.first_name ?? "") + (req.profile?.last_name ? ` ${req.profile?.last_name}` : "")}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptRequest(req.id, req.user_id)}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-md"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineRequest(req.id)}
                    className="rounded-md"
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
      <Card className="shadow-sm bg-white/80 backdrop-blur-md border border-indigo-100/60 rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight text-gray-800 flex items-center gap-2">
            <span>Your Friends</span>
            <span className="text-xs font-normal text-gray-400">Manage connections</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">You have no friends yet.</p>
          ) : (
            friends.map((f) => (
              <div
                key={f.id}
                className="relative flex items-center justify-between py-3 border-b last:border-b-0 hover:bg-indigo-50/50 transition-colors cursor-pointer rounded-md px-2"
                onMouseEnter={() => setActiveFriend(f.id)}
                onMouseLeave={() => setActiveFriend(null)}
                onClick={() => setActiveFriend((prev) => (prev === f.id ? null : f.id))}
              >
                <div className="flex items-center gap-3">
                  {renderAvatar(f)}
                  <div>
                    <p className="font-medium text-sm text-gray-800">{(f.first_name ?? "") + (f.last_name ? ` ${f.last_name}` : "")}</p>
                    <p className="text-xs text-gray-500">{"@" + f.username}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFriend(f.id);
                  }}
                  className="hover:text-red-600 hover:border-red-600 rounded-md"
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
                    className="absolute left-16 top-1/2 -translate-y-1/2 w-64 bg-white/90 backdrop-blur-md shadow-lg rounded-xl border border-indigo-100 p-3 z-50"
                    >
                    <p className="font-semibold text-gray-800 text-sm">
                        {f.first_name} {f.last_name}
                    </p>
                    <p className="text-xs text-gray-600 italic">{f.bio || "No bio yet"}</p>
                    {f.created_at && (
                        <p className="text-[10px] text-gray-500 mt-1">
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
    </motion.div>
  );
}
