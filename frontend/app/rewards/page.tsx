"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { initUser, listRewards, redeemReward, getCreditLogs, type Reward } from "@/lib/rewardApi";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";

// Predefined reward configurations with images and reasonable credit values
// Credit calculation: Assume average rent = £1000/month with 5% = 50 credits/month
// So £25 value ≈ 500 credits (10 months), £50 value ≈ 1000 credits (20 months)
const REWARD_CONFIGS: { [key: string]: { image: string; gradient: string; tag: string } } = {
  "Amazon Gift Card £25": {
    image: "/amazongiftcard.jpg",
    gradient: "from-orange-400 to-amber-500",
    tag: "Popular"
  },
  "Google Play Gift Card £25": {
    image: "/googlegiftcard25pounds.jpg",
    gradient: "from-blue-400 to-indigo-500",
    tag: "Gaming"
  },
  "Google Play Gift Card £50": {
    image: "/googlegiftcard50pounds.jpg",
    gradient: "from-blue-500 to-purple-600",
    tag: "Premium"
  },
  "Apple Gift Card £50": {
    image: "/applegiftcard50pounds.jpg",
    gradient: "from-gray-700 to-gray-900",
    tag: "Premium"
  },
  "Apple Gift Card £100": {
    image: "/applegiftcard100pounds.jpg",
    gradient: "from-gray-800 to-black",
    tag: "Exclusive"
  },
  "Rent Discount 5%": {
    image: "",
    gradient: "from-green-400 to-emerald-500",
    tag: "Housing"
  },
  "Utility Credit £10": {
    image: "",
    gradient: "from-cyan-400 to-teal-500",
    tag: "Bills"
  },
  "Coffee Voucher": {
    image: "",
    gradient: "from-amber-600 to-orange-700",
    tag: "Treat"
  },
  "Premium Month": {
    image: "",
    gradient: "from-purple-500 to-pink-600",
    tag: "Subscription"
  }
};

export default function RewardsCatalogPage() {
  const [items, setItems] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [currentCredits, setCurrentCredits] = useState<number>(0);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Initialize user when auth state changes
  useEffect(() => {
    let mounted = true;

    const initializeUser = async (session: Session | null) => {
      if (!session?.user) {
        setUserId("");
        setUserEmail("");
        setUserName("");
        setCurrentCredits(0);
        setTotalEarned(0);
        setTotalRedeemed(0);
        return;
      }

      const uid = session.user.id;
      const email = session.user.email || "";
      const username = session.user.user_metadata?.full_name || email.split("@")[0];

      if (!mounted) return;
      
      setUserId(uid);
      setUserEmail(email);

      try {
        // Initialize user profile if it doesn't exist
        const user = await initUser(uid, email, username);
        if (mounted) {
          // Set user name from backend (profiles.full_name)
          setUserName(user.UserName || username);
          setCurrentCredits(user.CurrentCredit);
        }

        // Get credit history for statistics
        try {
          const logs = await getCreditLogs(uid);
          const earned = logs
            .filter(log => log.ChangeAmount > 0)
            .reduce((sum, log) => sum + log.ChangeAmount, 0);
          const redeemed = logs
            .filter(log => log.ChangeAmount < 0)
            .reduce((sum, log) => sum + Math.abs(log.ChangeAmount), 0);
          
          if (mounted) {
            setTotalEarned(earned);
            setTotalRedeemed(redeemed);
          }
        } catch (err) {
          console.error("Failed to load credit stats:", err);
        }
      } catch (err: any) {
        console.error("Failed to initialize user:", err);
        if (mounted) {
          setError(`Failed to initialize user: ${err.message}`);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeUser(session);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        initializeUser(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load rewards
  useEffect(() => {
    const loadRewards = async () => {
      try {
        const data = await listRewards(true); // Only active rewards
        setItems(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load rewards");
      } finally {
        setLoading(false);
      }
    };

    loadRewards();
  }, []);

  async function handleRedeem(item: Reward) {
    if (!userId) {
      alert("Please sign in to redeem rewards.");
      return;
    }

    if (currentCredits < item.CreditCost) {
      alert(`Insufficient credits. You need ${item.CreditCost} but have ${currentCredits}.`);
      return;
    }

    if (!confirm(`Redeem ${item.Type} for ${item.CreditCost} credits?`)) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await redeemReward(userId, item.RewardID);
      
      // Update credits after redemption
      setCurrentCredits(prev => prev - item.CreditCost);
      setTotalRedeemed(prev => prev + item.CreditCost);
      
      alert(`✅ Successfully redeemed ${item.Type}!`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to redeem reward");
      alert(`❌ Redemption failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Filter rewards by category
  const categories = ["All", "Gift Cards", "Discounts", "Treats", "Other"];
  const filteredItems = selectedCategory === "All" 
    ? items 
    : items.filter(item => {
        const type = item.Type.toLowerCase();
        if (selectedCategory === "Gift Cards") {
          return type.includes("gift card") || type.includes("giftcard");
        } else if (selectedCategory === "Discounts") {
          return type.includes("discount") || type.includes("credit");
        } else if (selectedCategory === "Treats") {
          return type.includes("coffee") || type.includes("voucher");
        }
        return true;
      });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">🎁 Rewards Catalog</h1>
              {userName && (
                <p className="text-purple-100 text-lg">
                  Welcome back, <span className="font-semibold">{userName}</span>!
                </p>
              )}
              {userEmail && !userName && (
                <p className="text-purple-100 text-sm">{userEmail}</p>
              )}
            </div>
            
            {/* Credit Stats */}
            {userId && (
              <div className="flex gap-4">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 min-w-[140px]">
                  <div className="text-xs text-purple-100 uppercase tracking-wide">Available</div>
                  <div className="text-3xl font-bold mt-1">{currentCredits}</div>
                  <div className="text-xs text-purple-200 mt-1">credits</div>
                </Card>
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 min-w-[140px]">
                  <div className="text-xs text-purple-100 uppercase tracking-wide">Earned</div>
                  <div className="text-2xl font-bold mt-1 text-green-300">+{totalEarned}</div>
                  <div className="text-xs text-purple-200 mt-1">lifetime</div>
                </Card>
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 min-w-[140px]">
                  <div className="text-xs text-purple-100 uppercase tracking-wide">Redeemed</div>
                  <div className="text-2xl font-bold mt-1 text-orange-300">-{totalRedeemed}</div>
                  <div className="text-xs text-purple-200 mt-1">lifetime</div>
                </Card>
              </div>
            )}
            
            {!userId && (
              <div className="bg-white/10 backdrop-blur-sm border-white/20 rounded-lg p-6 text-center">
                <p className="text-sm text-purple-100 mb-2">Sign in to start earning rewards!</p>
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = '/login'}
                  className="bg-white text-purple-600 hover:bg-purple-50"
                >
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Category Filter */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Filter:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rewards...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Rewards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const config = REWARD_CONFIGS[item.Type] || { image: "", gradient: "from-gray-400 to-gray-600", tag: "Reward" };
            const canAfford = currentCredits >= item.CreditCost;
            
            return (
              <Card 
                key={item.RewardID} 
                className={`group overflow-hidden hover:shadow-2xl transition-all duration-300 ${
                  !canAfford && userId ? 'opacity-60' : 'hover:-translate-y-1'
                }`}
              >
                {/* Image or Gradient Header */}
                <div className={`relative h-48 bg-gradient-to-br ${config.gradient} overflow-hidden`}>
                  {config.image ? (
                    <Image
                      src={config.image}
                      alt={item.Type}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {item.Icon && <span className="text-6xl opacity-90">{item.Icon}</span>}
                    </div>
                  )}
                  
                  {/* Tag */}
                  <div className="absolute top-3 right-3">
                    <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-800 shadow-md">
                      {config.tag}
                    </span>
                  </div>
                  
                  {/* Insufficient Credits Overlay */}
                  {!canAfford && userId && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold text-sm">
                        Need {item.CreditCost - currentCredits} more credits
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1">
                      {item.Type}
                    </h3>
                    {item.Description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.Description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {item.CreditCost}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">credits</span>
                    </div>
                    
                    <Button
                      disabled={busy || !item.Active || !userId || !canAfford}
                      onClick={() => handleRedeem(item)}
                      className={`${
                        canAfford && userId
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                          : 'bg-gray-400'
                      } text-white font-semibold`}
                      size="sm"
                    >
                      {!userId ? 'Sign In' : canAfford ? 'Redeem' : 'Locked'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No rewards found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedCategory !== "All" 
                ? `No rewards in the "${selectedCategory}" category.` 
                : "No rewards available at the moment."}
            </p>
            {selectedCategory !== "All" && (
              <Button
                onClick={() => setSelectedCategory("All")}
                variant="outline"
                className="mt-4"
              >
                View All Rewards
              </Button>
            )}
          </div>
        )}

        {/* Info Section */}
        {userId && (
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
              <div className="text-3xl mb-3">💳</div>
              <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Earn Credits</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pay your bills to earn credits. Rent: 5%, Utilities: 3%, Subscriptions: 2%
              </p>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
              <div className="text-3xl mb-3">🎁</div>
              <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Redeem Rewards</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use your credits to redeem gift cards, discounts, and exclusive perks
              </p>
            </Card>
            
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="text-3xl mb-3">🏆</div>
              <h4 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Climb the Ranks</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compete with others on the leaderboard and unlock special achievements
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
