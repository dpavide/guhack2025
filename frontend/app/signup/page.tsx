"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    try {
      // Validate username
      const cleanUsername = username.replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
        throw new Error(
          "Username must be 3–20 characters, lowercase letters, numbers, or underscores only."
        );
      }

      // Step 1: Sign up user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Step 2: Insert user profile details
      const user = data.user;
      if (user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            username: cleanUsername,
            credits: 0, // optional: initialize to 0
          },
        ]);

        if (profileError?.message?.includes("duplicate key")) {
          throw new Error("Username is already taken. Please choose another one.");
        }
        if (profileError) throw profileError;
      }

      // Step 3: Redirect or confirm
      if ((data as any)?.session) {
        router.push("/dashboard");
      } else {
        alert("Signup successful! Please verify your email before logging in.");
        router.push("/login");
      }
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-green-50 to-teal-100">
      <h1 className="text-3xl font-bold mb-4">Create an Account</h1>

      <input
        className="p-2 rounded border w-64"
        placeholder="First name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />

      <input
        className="p-2 rounded border w-64"
        placeholder="Last name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />

      <input
        className="p-2 rounded border w-64"
        placeholder="@username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        className="p-2 rounded border w-64"
        placeholder="Email address"
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
