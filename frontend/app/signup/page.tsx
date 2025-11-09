"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { AtSign, Mail, Lock, User, Dice5 } from "lucide-react";

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
  const handleSignup = useCallback(async () => {
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
  }, [username, email, password, firstName, lastName, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleSignup();
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
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Join Splitr and start sharing expenses smarter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="first">First name</Label>
                <Input
                  id="first"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  icon={<User className="h-4 w-4" />}
                  onKeyDown={onKeyDown}
                />
              </div>
              <div>
                <Label htmlFor="last">Last name</Label>
                <Input
                  id="last"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  icon={<User className="h-4 w-4" />}
                  onKeyDown={onKeyDown}
                />
              </div>

              <div>
                <Label htmlFor="username" hint="3–20 chars: a–z, 0–9, _">
                  Username
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      const v = e.target.value;
                      setUsername(v.replace(/^@/, ""));
                      setUsernameAvailable(null);
                    }}
                    onBlur={() => checkUsernameAvailability(username)}
                    placeholder="e.g. coolcapybara"
                    icon={<AtSign className="h-4 w-4" />}
                    onKeyDown={onKeyDown}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRandomize}
                    disabled={usernameChecking}
                    title="Randomize username"
                    className="shrink-0"
                    aria-label="Randomize username"
                  >
                    <Dice5 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 text-sm min-h-5">
                  {usernameChecking && <span className="text-gray-500">Checking…</span>}
                  {usernameAvailable === true && <span className="text-green-600">Username available ✓</span>}
                  {usernameAvailable === false && <span className="text-red-600">Username not allowed or taken</span>}
                  {usernameAvailable === null && <span className="text-gray-500">Tip: press the dice for ideas</span>}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  icon={<Mail className="h-4 w-4" />}
                  onKeyDown={onKeyDown}
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  icon={<Lock className="h-4 w-4" />}
                  onKeyDown={onKeyDown}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3">
            <Button
              onClick={handleSignup}
              disabled={loading || !email || !password}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {loading ? "Creating…" : "Create account"}
            </Button>
            <p className="text-sm text-gray-500 text-center">
              Already have an account? {" "}
              <Link className="text-indigo-600 hover:underline" href="/login">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
