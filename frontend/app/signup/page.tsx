"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      // Step 1: Sign up user
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) throw error;

      // Step 2: If signup successful, insert into profiles table
      const user = data.user;
      if (user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id, // same as auth user id
            full_name: username,
            email: email,
          },
        ]);
        if (profileError) throw profileError;
      }

      // Step 3: Redirect or notify
      if ((data as any)?.session) {
        router.push("/dashboard");
      } else {
        alert("Signup successful. Please check your email to confirm your account.");
        router.push("/login");
      }
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-gradient-to-br from-green-50 to-teal-100">
      <h1 className="text-3xl font-bold mb-4">Create an Account</h1>

      <input
        className="p-2 rounded border w-64"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

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
        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60 mt-2"
      >
        {loading ? "Creating..." : "Sign up"}
      </button>
    </div>
  );
}
