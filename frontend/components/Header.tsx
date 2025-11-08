"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setEmail(data.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="font-semibold">GUHack 2025</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/rewards">Rewards</Link>
          <Link href="/reward">Reward System</Link>
        </nav>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="text-sm text-gray-600">{email}</span>
              <Button size="sm" variant="outline" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm">Login</Link>
              <Link href="/signup" className="text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
