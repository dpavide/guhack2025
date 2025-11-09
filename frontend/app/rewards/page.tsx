"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card"; // Adjusted: removed duplicate CardHeader, CardTitle
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import Image from "next/image";
import { Gift, Lock, Sparkles, Target, History } from "lucide-react";

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);

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

    // 1️⃣ Record to credit_log (do this first to maintain transaction integrity)
    const { error: logError } = await supabase.from("credit_log").insert([
      {
        user_id: userId,
        source_type: "redemption",
        source_id: null, // source_id is optional, set to null for redemptions
        change_amount: -item.credit_cost,
        balance_after: newCredits,
      },
    ]);

    if (logError) {
      alert("Failed to log credit transaction");
      console.error("Credit log error:", logError);
      return;
    }

    // 2️⃣ Deduct credits from profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ credits: newCredits })
      .eq("id", userId);

    if (updateError) {
      alert("Failed to redeem item");
      console.error("Profile update error:", updateError);
      return;
    }

    // 3️⃣ Update UI
    setCredits(newCredits);
    
    // Refresh credit history if dialog is open
    if (isHistoryOpen) {
      await fetchCreditHistory();
    }
    
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

  // Fetch credit history
  const fetchCreditHistory = async () => {
    if (!userId) return;

    try {
      // Fetch credit history from credit_log table
      const { data, error } = await supabase
        .from("credit_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Failed to fetch credit history:", error);
        setCreditHistory([]);
      } else {
        setCreditHistory(data || []);
      }
    } catch (error) {
      console.error("Error fetching credit history:", error);
      setCreditHistory([]);
    }
  };

  // Open history dialog
  const handleViewHistory = async () => {
    await fetchCreditHistory();
    setIsHistoryOpen(true);
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"
          />
          <p className="text-gray-600 text-lg font-medium">Loading rewards...</p>
        </motion.div>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
    >
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Gift className="w-8 h-8 text-blue-600" />
                Rewards Shop
              </h1>
              <p className="text-gray-600">
                Redeem your credits for gift cards and exclusive rewards
              </p>
            </div>
            
            {/* Credits Display and History Button */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleViewHistory}
                className="flex items-center gap-2 border-blue-200 hover:bg-blue-50"
              >
                <History className="w-4 h-4" />
                View History
              </Button>
              
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white border-2 border-blue-200 rounded-xl px-6 py-4 shadow-md"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-blue-600">{credits.toFixed(0)}</span>
                  <span className="text-gray-600 font-medium">credits</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="container mx-auto px-6 py-8">
        {shopItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Gift className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Rewards Available</h3>
            <p className="text-gray-500">Check back soon for new rewards</p>
          </motion.div>
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
                  <Card className="group h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl border-gray-200">
                    {/* Product Image */}
                    <div className={`relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden ${
                      !canAfford ? 'opacity-60' : ''
                    }`}>
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.item_name}
                          fill
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gift className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                      {!canAfford && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2">
                            <Lock className="w-4 h-4 text-gray-700" />
                            <span className="text-sm font-semibold text-gray-700">Locked</span>
                          </div>
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
                            <span className="flex items-center justify-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Redeem Now
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <Lock className="w-4 h-4" />
                              Need {item.credit_cost - credits} more
                            </span>
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
                          <span className="flex items-center justify-center gap-2">
                            <Target className="w-4 h-4" />
                            {isCurrentGoal ? 'Current Goal' : 'Set as Goal'}
                          </span>
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

      {/* Credit History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-blue-600" />
              Credit Transaction History
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {creditHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No credit transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditHistory.map((log) => {
                  const changeAmount = Number(log.change_amount || 0);
                  const isPositive = changeAmount > 0;
                  const amount = Math.abs(changeAmount);
                  
                  return (
                    <motion.div
                      key={log.log_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isPositive ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {isPositive ? (
                            <Sparkles className="w-6 h-6 text-green-600" />
                          ) : (
                            <Gift className="w-6 h-6 text-red-600" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isPositive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {isPositive ? "➕ Earned" : "➖ Spent"}
                            </span>
                            <span className="text-sm text-gray-600 font-medium">
                              {log.source_type === "payment" 
                                ? "Payment reward" 
                                : log.source_type === "redemption"
                                ? "Reward redemption"
                                : log.source_type || "Transaction"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}>
                          {isPositive ? "+" : "-"}£{amount.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Balance: £{Number(log.balance_after || 0).toFixed(2)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}