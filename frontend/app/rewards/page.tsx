"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card"; // Adjusted: removed duplicate CardHeader, CardTitle
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

// Map item names to image files
const getItemImage = (itemName: string): string | null => {
  const name = itemName.toLowerCase();
  
  // Apple gift cards
  if (name.includes("apple") && name.includes("50")) return "/applegiftcard50pounds.jpg";
  if (name.includes("apple") && name.includes("100")) return "/applegiftcard100pounds.jpg";
  
  // Google gift cards
  if (name.includes("google") && (name.includes("play") || name.includes("pay"))) return "/googlepaygiftcard10pound.jpg";
  if (name.includes("google") && name.includes("25")) return "/googlegiftcard25pounds.jpg";
  if (name.includes("google") && name.includes("50")) return "/googlegiftcard50pounds.jpg";
  
  // Steam gift cards
  if (name.includes("steam") && name.includes("10")) return "/steam10pound.jpg";
  if (name.includes("steam") && name.includes("20")) return "/steam20pound copy.jpg";
  
  // Starbucks
  if (name.includes("starbucks")) return "/starbucks10pound.jpg";
  
  // Amazon
  if (name.includes("amazon")) return "/amazon.jpg";
  
  return null; // no image available
};

export default function RewardsPage() {
  const [credits, setCredits] = useState<number>(0);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<any>(null);

  // Listen for goal changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const savedGoal = localStorage.getItem("user_goal");
      setCurrentGoal(savedGoal ? JSON.parse(savedGoal) : null);
    };

    // Initial check
    handleStorageChange();

    // Listen for changes
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("goalChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("goalChanged", handleStorageChange);
    };
  }, []);

  // Fetch profile + shop items
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      // Fetch profile credits
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (profileError) console.error("Profile error:", profileError);
      else setCredits(profile?.credits ?? 0);

      // Fetch credit shop items
      const { data: items, error: shopError } = await supabase
        .from("credit_shop")
        .select("*")
        .eq("status", "active")
        .order("credit_cost", { ascending: true });

      if (shopError) console.error("Shop error:", shopError);
      else setShopItems(items ?? []);

      setLoading(false);
    };

    fetchData();
  }, []);

  // Handle redemption
  const handleRedeem = async (item: any) => {
    if (!userId) return;
    if (credits < item.credit_cost) {
      alert("Not enough credits to redeem this item!");
      return;
    }

    const confirmRedeem = window.confirm(
      `Redeem ${item.item_name} for ${item.credit_cost} credits?`
    );
    if (!confirmRedeem) return;

    const newCredits = credits - item.credit_cost;

    // 1️⃣ Deduct credits from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      alert("Failed to redeem item");
      console.error(updateError);
      return;
    }

    // 2️⃣ Record redemption
    await supabase.from("redemptions").insert([
      {
        user_id: userId,
        redemption_type: item.item_name,
        amount: item.credit_cost,
        description: item.item_description,
      },
    ]);

    // 3️⃣ Update UI
    setCredits(newCredits);
    alert(`✅ Successfully redeemed ${item.item_name}!`);
  };
  
  // Function to handle setting/deselecting the goal
  const handleSetGoal = (item: any, isCurrentGoal: boolean) => {
    if (!userId) {
      alert("Please sign in to set a goal");
      return;
    }

    try {
      if (isCurrentGoal) {
        // Deselect the goal
        localStorage.removeItem("user_goal");
        window.dispatchEvent(new CustomEvent("goalChanged", { detail: null }));
        setCurrentGoal(null);
      } else {
        // Set a new goal
        const goal = {
          shop_item_id: item.shop_item_id,
          item_name: item.item_name,
          credit_goal: item.credit_cost,
          user_id: userId,
        };
        localStorage.setItem("user_goal", JSON.stringify(goal));
        window.dispatchEvent(new CustomEvent("goalChanged", { detail: goal }));
        setCurrentGoal(goal);
      }
    } catch (err) {
      console.error("Failed to update goal in localStorage", err);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading rewards...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎁 Rewards Shop
              </h1>
              <p className="text-gray-600">
                Redeem your credits for gift cards and exclusive rewards
              </p>
            </div>
            
            {/* Credits Display */}
            <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl px-6 py-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">{credits.toFixed(0)}</span>
                <span className="text-gray-600 font-medium">credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="container mx-auto px-6 py-8">
        {shopItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Rewards Available</h3>
            <p className="text-gray-500">Check back soon for new rewards!</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shopItems.map((item, index) => {
              const canAfford = credits >= item.credit_cost;
              const itemImage = getItemImage(item.item_name);
              const isCurrentGoal = currentGoal && currentGoal.shop_item_id === item.shop_item_id;
              
              return (
                <motion.div
                  key={item.shop_item_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`group h-full flex flex-col overflow-hidden transition-all duration-200 ${
                    canAfford 
                      ? 'hover:shadow-xl border-gray-200' 
                      : 'opacity-60 border-gray-200'
                  }`}>
                    {/* Product Image */}
                    <div className="relative w-full h-48 bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.item_name}
                          fill
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-6xl mb-2">🎁</div>
                            <p className="text-sm text-gray-400 font-medium">Reward Item</p>
                          </div>
                        </div>
                      )}
                      {!canAfford && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white px-4 py-2 rounded-full text-sm font-semibold text-gray-700">
                            🔒 Locked
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="flex-1 flex flex-col p-5">
                      <h3 className="font-bold text-gray-900 mb-2 text-lg">
                        {item.item_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-2">
                        {item.item_description || "Exclusive reward item"}
                      </p>
                      
                      {/* Price */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-500 font-medium">Cost</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">
                              {item.credit_cost}
                            </span>
                            <span className="text-sm text-gray-500">credits</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <Button
                          disabled={!canAfford}
                          onClick={() => handleRedeem(item)}
                          className={`w-full ${
                            canAfford
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? (
                            '✨ Redeem Now'
                          ) : (
                            `Need ${item.credit_cost - credits} more`
                          )}
                        </Button>

                        <Button
                          variant={isCurrentGoal ? "default" : "outline"}
                          className={`w-full ${
                            isCurrentGoal 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSetGoal(item, isCurrentGoal)}
                          disabled={!userId}
                        >
                          {isCurrentGoal ? '⭐ Current Goal' : '🎯 Set as Goal'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}