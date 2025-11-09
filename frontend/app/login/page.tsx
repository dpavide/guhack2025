"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const handleLogin = useCallback(async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.session) {
        const { user } = data.session;
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
        router.replace("/login");
      }
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }, [email, password, router, API_BASE_URL]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3rem)] md:min-h-screen flex items-center justify-center py-10 md:py-16">
      {/* background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-slate-100" />
      <div className="absolute -z-10 inset-0 bg-[radial-gradient(800px_400px_at_50%_-20%,rgba(79,70,229,0.08),transparent)]" />

      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg border-gray-100/80">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to continue to Splitr</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2.5 rounded-md border border-red-200">{error}</div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock className="h-4 w-4" />}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <Button onClick={handleLogin} disabled={loading || !email || !password} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-sm text-gray-500 text-center">
              No account? {" "}
              <Link className="text-indigo-600 hover:underline" href="/signup">Create one</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
