"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

// Map item names to image files
const getItemImage = (itemName: string): string | null => {
  const name = itemName.toLowerCase();
  if (name.includes("amazon")) return "/amazongiftcard.jpg";
  if (name.includes("google") && name.includes("25")) return "/googlegiftcard25pounds.jpg";
  if (name.includes("google") && name.includes("50")) return "/googlegiftcard50pounds.jpg";
  if (name.includes("apple") && name.includes("50")) return "/applegiftcard50pounds.jpg";
  if (name.includes("apple") && name.includes("100")) return "/applegiftcard100pounds.jpg";
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
<<<<<<< HEAD
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
=======
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white p-8">
      <Card className="mb-8 shadow-lg bg-white/80 backdrop-blur-md border-blue-100">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            🎁 Rewards & Credit Shop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
>>>>>>> main
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Rewards Shop
              </h1>
              <p className="text-gray-600">
                Redeem your credits for gift cards and rewards
              </p>
            </div>
            
            {/* Credits Badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">{credits}</span>
                <span className="text-sm text-gray-600">credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
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
                    {/* Product Image or Placeholder */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
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
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {item.item_name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 flex-1">
                        {item.item_description || "Exclusive reward"}
                      </p>
                      
                      {/* Price and Button */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Cost</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">
                              {item.credit_cost}
                            </span>
                            <span className="text-sm text-gray-500">credits</span>
                          </div>
                        </div>
                        
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
                            'Redeem Now'
                          ) : (
                            `Need ${item.credit_cost - credits} more`
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
=======
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {shopItems.map((item) => (
          <motion.div
            key={item.shop_item_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="hover:shadow-lg transition-shadow border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg">{item.item_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-2">{item.item_description}</p>
                <p className="font-semibold mb-3">
                  Cost: {item.credit_cost} credits
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={credits < item.credit_cost}
                    onClick={() => handleRedeem(item)}
                    className="flex-1"
                  >
                    {credits < item.credit_cost ? "Not Enough Credits" : "Redeem"}
                  </Button>

                  {(() => {
                    const isCurrentGoal = currentGoal && currentGoal.shop_item_id === item.shop_item_id;
                    
                    return (
                      <Button
                        variant={isCurrentGoal ? "default" : "outline"}
                        className={`flex-1 ${isCurrentGoal ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        onClick={() => {
                          // Pure front-end: save goal into localStorage and notify listeners
                          if (!userId) {
                            alert("Please sign in to set a goal");
                            return;
                          }

                          const goal = {
                            shop_item_id: item.shop_item_id,
                            item_name: item.item_name,
                            credit_goal: item.credit_cost,
                            user_id: userId,
                          };

                          try {
                            localStorage.setItem("user_goal", JSON.stringify(goal));
                            // dispatch a custom event so dashboard (if open) updates immediately
                            window.dispatchEvent(new CustomEvent("goalChanged", { detail: goal }));
                          } catch (err) {
                            console.error("Failed to save goal to localStorage", err);
                          }
                        }}
                        disabled={!userId}
                      >
                        {isCurrentGoal ? '✨ Current Goal' : 'Set as Goal'}
                      </Button>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
>>>>>>> main
      </div>
    </div>
  );
}
