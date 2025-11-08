"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  email: string | null;
  full_name?: string | null;
  created_at?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        router.push("/");
        return;
      }

      // Base info from Supabase Auth
      let enriched: Profile = {
        id: user.id,
        email: user.email ?? null,
        full_name: user.user_metadata?.full_name ?? null,
        created_at: user.created_at ?? null,
      };

      // Try to enrich from a `profiles` table if it exists
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data) {
          enriched = {
            ...enriched,
            full_name: (data.full_name || data.name) ?? enriched.full_name ?? null,
          };
        }
      } catch {
        // ignore; fall back to auth-only data
      } finally {
        setProfile(enriched);
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return <div className="text-gray-600">Loading profile…</div>;
  if (!profile) return <div className="text-red-600">Could not load profile.</div>;

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">User ID</span>
            <span className="font-mono text-sm">{profile.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span>{profile.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span>{profile.full_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Joined</span>
            <span>
              {profile.created_at
                ? new Date(profile.created_at).toLocaleString()
                : "—"}
            </span>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={handleLogout}>Log out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
