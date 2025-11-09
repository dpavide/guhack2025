"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Camera, Edit2, Check, X } from "lucide-react";
import { motion } from "framer-motion";

type Profile = {
  id: string;
  email: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.push("/");
        return;
      }

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

    const enriched: Profile = {
      id: user.id,
      email: user.email ?? null,
      username: data?.username ?? null,
      first_name: data?.first_name ?? null,
      last_name: data?.last_name ?? null,
      avatar_url: data?.avatar_url ?? null,
      bio: data?.bio ?? null,
      created_at: user.created_at ?? null,
    };

        setProfile(enriched);
    setBio(enriched.bio ?? "");
        setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !profile) return;

    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert("File must be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: base64String })
          .eq("id", profile.id);

        if (error) throw error;

        setProfile({ ...profile, avatar_url: base64String });
        alert("✅ Picture updated!");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Failed to upload");
      console.error(error);
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio })
        .eq("id", profile.id);

      if (error) throw error;

      await loadProfile();
      setEditing(false);
      alert("✅ Bio updated!");
    } catch (error) {
      alert("Failed to save");
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
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
            Loading profile...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold">Error loading profile</p>
          <Button onClick={() => router.push("/")} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  const displayName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Unnamed User";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header Card */}
        <Card className="mb-6 overflow-hidden shadow-lg">
          <div className="h-28 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" />
          
          <CardContent className="relative pt-0 pb-6">
            <div className="absolute -top-14 left-6">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-lg">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="Profile"
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white text-3xl font-bold rounded-full">
                      {(profile.first_name || profile.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <label className="absolute bottom-0 right-0 bg-slate-900 hover:bg-black text-white p-2 rounded-full shadow-lg transition-all cursor-pointer group-hover:scale-110 duration-200 border-2 border-white">
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="pt-16">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">
                    {displayName}
                  </h1>
                  <p className="text-gray-600 text-sm">@{profile.username ?? "unknown"}</p>
                </div>

                <Button 
                  onClick={handleLogout} 
                  variant="outline"
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-600 transition-all"
                >
                  Log out
                </Button>
              </div>

              {/* Bio Section */}
              {editing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      maxLength={200}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none text-sm"
                    />
                    <span className="absolute bottom-2 right-2 text-xs text-gray-400">
                      {bio.length}/200
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveBio}
                      size="sm"
                      className="bg-slate-900 hover:bg-black transition-all"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditing(false);
                        setBio(profile.bio ?? "");
                      }}
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-start justify-between">
                    <p className="text-gray-700 flex-1">
                      {profile.bio || (
                        <span className="text-gray-400 italic">No bio yet. Click edit to add one!</span>
                      )}
                    </p>
                    <Button 
                      onClick={() => setEditing(true)} 
                      variant="outline" 
                      size="sm"
                      className="ml-4 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Details Card */}
        <Card className="shadow-md">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-lg">Account Information</CardTitle>
        </CardHeader>
          <CardContent className="space-y-0 pt-3">
            <div className="flex justify-between py-3 border-b hover:bg-gray-50 transition-colors px-2 rounded">
              <span className="text-gray-600 text-sm font-medium">Username</span>
              <span className="text-gray-900 text-sm">@{profile.username ?? "unknown"}</span>
            </div>
            <div className="flex justify-between py-3 border-b hover:bg-gray-50 transition-colors px-2 rounded">
              <span className="text-gray-600 text-sm font-medium">First Name</span>
              <span className="text-gray-900 text-sm">{profile.first_name ?? "—"}</span>
          </div>
            <div className="flex justify-between py-3 border-b hover:bg-gray-50 transition-colors px-2 rounded">
              <span className="text-gray-600 text-sm font-medium">Last Name</span>
              <span className="text-gray-900 text-sm">{profile.last_name ?? "—"}</span>
          </div>
            <div className="flex justify-between py-3 border-b hover:bg-gray-50 transition-colors px-2 rounded">
              <span className="text-gray-600 text-sm font-medium">Email</span>
              <span className="text-gray-900 text-sm">{profile.email ?? "—"}</span>
          </div>
            <div className="flex justify-between py-3 hover:bg-gray-50 transition-colors px-2 rounded">
              <span className="text-gray-600 text-sm font-medium">Joined</span>
              <span className="text-gray-900 text-sm">
              {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
