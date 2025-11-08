"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
    else router.push("/dashboard");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gradient-to-br from-indigo-100 to-purple-200">
      <h1 className="text-3xl font-bold">Welcome to Housr</h1>
      <input
        className="p-2 rounded border w-64"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="p-2 rounded border w-64"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
      >
        Login
      </button>
      <p className="text-sm text-gray-600 mt-2">
        Don't have an account?{' '}
        <Link href="/signup" className="text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
