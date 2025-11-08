"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
      } else {
        // If a session is returned, the user is signed in immediately.
        // Otherwise, Supabase may have sent a confirmation email.
        if ((data as any)?.session) {
          router.push("/dashboard");
        } else {
          alert("Signup successful. Please check your email to confirm your account.");
          router.push("/login");
        }
      }
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gradient-to-br from-green-50 to-teal-100">
      <h1 className="text-3xl font-bold">Create an account</h1>
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
        onClick={handleSignup}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
      >
        {loading ? "Creating..." : "Sign up"}
      </button>
    </div>
  );
}
