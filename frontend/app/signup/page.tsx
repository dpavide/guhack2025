"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState(""); // stored without '@'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const adjectives = [
    "amazing", "brave", "sleepy", "curious", "happy", "gentle", "mighty", "clever",
    "fuzzy", "shiny", "lazy", "bold", "calm", "swift", "silly", "fierce", "loyal",
    "graceful", "wild", "quiet", "noisy", "frozen", "fiery", "stormy", "sunny",
    "chilly", "warm", "dreamy", "noble", "fearless", "tiny", "huge", "rapid",
    "fancy", "daring", "jolly", "glowing", "rusty", "bouncy", "friendly", "zippy",
    "spotty", "striped", "gentle", "hungry", "mellow", "sharp", "vivid", "cosmic",
    "dusty", "electric", "silver", "golden", "frozen", "icy", "mystic", "epic",
    "peaceful", "hyper", "bright", "cool", "weird", "cheerful", "smart", "strong",
    "crafty", "tidy", "whimsical", "goofy", "shy", "boldest", "tough", "spicy",
    "bitter", "sweet", "radical", "stellar", "atomic", "galactic", "lunar",
    "solar", "ghostly", "shadowy", "heroic", "playful", "dynamic", "brilliant",
    "fuzzy", "mystical", "ancient", "modern", "neon", "frosty", "stormy",
    "gentle", "peaceful", "fearless", "rowdy"
  ];

  const animals = [
    "capybara", "tiger", "panda", "otter", "dolphin", "lion", "fox", "penguin",
    "koala", "sloth", "parrot", "wolf", "cat", "dog", "eagle", "bear", "whale",
    "falcon", "raven", "seal", "rabbit", "owl", "mouse", "rat", "deer", "hawk",
    "moose", "badger", "weasel", "skunk", "beaver", "horse", "cow", "bull",
    "goat", "sheep", "frog", "lizard", "snake", "dragon", "phoenix", "bat",
    "monkey", "lemur", "cheetah", "leopard", "panther", "camel", "giraffe",
    "zebra", "crocodile", "rhino", "hippo", "chicken", "duck", "goose", "turkey",
    "rooster", "crane", "heron", "sparrow", "finch", "robin", "jay", "cardinal",
    "vulture", "antelope", "boar", "buffalo", "donkey", "yak", "kangaroo",
    "platypus", "hedgehog", "ferret", "hamster", "squirrel", "otter", "sealion",
    "stingray", "shark", "octopus", "squid", "jellyfish", "seahorse", "crab",
    "lobster", "bee", "ant", "spider", "butterfly", "moth", "ladybug", "snail",
    "turtle", "toad", "iguana", "chameleon", "gecko", "viper", "cobra", "parakeet",
    "macaw", "flamingo", "pigeon", "crow", "swan", "peacock", "lynx"
  ];


  // Utility: clean username (strip @ and force lowercase)
  const clean = (s: string) => s.replace(/^@/, "").toLowerCase().trim();

  // Check username availability
  const checkUsernameAvailability = async (raw: string) => {
    const name = clean(raw);
    if (!name) {
      setUsernameAvailable(null);
      return false;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(name)) {
      setUsernameAvailable(false);
      return false;
    }

    setUsernameChecking(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("username", name)
        .maybeSingle();

      // if data exists => taken
      const taken = !!data;
      setUsernameAvailable(!taken);
      return !taken;
    } catch (err) {
      setUsernameAvailable(null);
      return false;
    } finally {
      setUsernameChecking(false);
    }
  };

  // Generate a random username and ensure uniqueness
  const generateUniqueUsername = async (): Promise<string> => {
    for (let attempts = 0; attempts < 12; attempts++) {
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const animal = animals[Math.floor(Math.random() * animals.length)];
      const number = Math.random() < 0.6 ? "" : String(Math.floor(Math.random() * 99)); // sometimes add number
      const candidate = `${adjective}${animal}${number}`.toLowerCase();
      // quick format guard
      if (!/^[a-z0-9_]{3,20}$/.test(candidate)) continue;
      const available = await checkUsernameAvailability(candidate);
      if (available) return candidate;
    }
    // fallback: append timestamp suffix (extremely unlikely to collide)
    return `${adjectives[0]}${animals[0]}${Date.now() % 10000}`;
  };

  // Handler for dice button
  const handleRandomize = async () => {
    setUsernameChecking(true);
    const generated = await generateUniqueUsername();
    setUsername(generated);
    setUsernameAvailable(true);
    setUsernameChecking(false);
  };

  // Sign up handler
  const handleSignup = async () => {
    setLoading(true);
    try {
      // if username empty, generate one
      let finalUsername = clean(username);
      if (!finalUsername) {
        finalUsername = await generateUniqueUsername();
        setUsername(finalUsername);
      }

      // validate final username
      if (!/^[a-z0-9_]{3,20}$/.test(finalUsername)) {
        throw new Error("Username must be 3–20 chars: lowercase letters, numbers or underscores.");
      }

      // check availability one last time
      const available = await checkUsernameAvailability(finalUsername);
      if (!available) throw new Error("Username is already taken — try another or press the dice.");

      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      const user = (data as any)?.user;
      if (user) {
        // Insert profile
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email,
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
            username: finalUsername,
            credits: 0,
          },
        ]);
        if (profileError) throw profileError;
      }

      // redirect depending on session / verification
      if ((data as any)?.session) {
        router.push("/dashboard");
      } else {
        alert(`Signup successful! Your username is @${finalUsername}. Please verify your email.`);
        router.push("/login");
      }
    } catch (err: any) {
      alert(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gradient-to-br from-green-50 to-teal-100 p-6">
      <h1 className="text-3xl font-bold mb-2">Create an Account</h1>

      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-3">
        <div className="flex gap-2">
          <input
            className="p-2 rounded border w-full"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="p-2 rounded border w-full"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <div className="flex items-center gap-2">
            <div className="flex items-center px-3 py-2 border rounded w-full bg-gray-50">
              <span className="text-gray-500 mr-2">@</span>
              <input
                className="flex-1 bg-transparent outline-none"
                placeholder="choose a username or press the dice"
                value={username}
                onChange={(e) => {
                  const v = e.target.value;
                  setUsername(v.replace(/^@/, ""));
                  setUsernameAvailable(null);
                }}
                onBlur={() => checkUsernameAvailability(username)}
              />
            </div>

            {/* Dice button */}
            <button
              type="button"
              onClick={handleRandomize}
              disabled={usernameChecking}
              title="Randomize username"
              className="inline-flex items-center justify-center px-3 py-2 border rounded hover:bg-gray-100"
            >
              {/* simple dice SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <circle cx="8" cy="8" r="1.4" fill="white" />
                <circle cx="16" cy="8" r="1.4" fill="white" />
                <circle cx="8" cy="16" r="1.4" fill="white" />
                <circle cx="16" cy="16" r="1.4" fill="white" />
              </svg>
            </button>
          </div>

          <div className="mt-2 text-sm">
            {usernameChecking && <span className="text-gray-500">Checking...</span>}
            {usernameAvailable === true && <span className="text-green-600">Username available ✓</span>}
            {usernameAvailable === false && <span className="text-red-600">Username not allowed or taken</span>}
            {usernameAvailable === null && <span className="text-gray-500">3–20 chars, lowercase letters, numbers or underscores</span>}
          </div>
        </div>

        <input
          className="p-2 rounded border w-full"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="p-2 rounded border w-full"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex justify-end">
          <Button
            onClick={handleSignup}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Sign up"}
          </Button>
        </div>
      </div>
    </div>
  );
}
