"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock } from "lucide-react";

export default function RootLoginLikePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Keep original login logic unchanged
  const handleLogin = useCallback(async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push("/dashboard");
  }, [email, password, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="relative min-h-[calc(100vh-3rem)] md:min-h-screen flex items-center justify-center py-10 md:py-16">
      {/* background to match login */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-slate-100" />
      <div className="absolute -z-10 inset-0 bg-[radial-gradient(800px_400px_at_50%_-20%,rgba(79,70,229,0.08),transparent)]" />

      <div className="w-full max-w-md px-4">
        <Card className="shadow-lg border-gray-100/80">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Splitr</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button onClick={handleLogin} className="w-full bg-indigo-600 text-white hover:bg-indigo-700">
              Sign in
            </Button>
            <p className="text-sm text-gray-500 text-center">
              Don't have an account? {" "}
              <Link className="text-indigo-600 hover:underline" href="/signup">Create one</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
