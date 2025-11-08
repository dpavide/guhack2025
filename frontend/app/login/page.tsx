"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        // Ensure profile exists in our DB with the auth user id
        const user = data.session.user;
        const userName = (user.user_metadata as any)?.full_name || (user.email?.split("@")[0] ?? "");
        try {
          await fetch(`${API_BASE_URL}/api/reward/users/ensure`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ UserID: user.id, Email: user.email, UserName: userName }),
          });
        } catch (_e) {
          // non-fatal; allow navigation
        }
        router.replace("/rewards");
      } else {
        // If email confirmation is enabled and not confirmed
        router.replace("/login");
      }
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Log in</h1>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">{error}</div>
        )}
        <div className="space-y-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </div>
        <Button onClick={handleLogin} disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <div className="text-sm text-gray-500">
          No account? <a className="text-emerald-700 hover:underline" href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  );
}
