"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function RewardsPage() {
  const [credits, setCredits] = useState<number>(0);
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

    const confirm = window.confirm(
      `Redeem ${item.item_name} for ${item.credit_cost} credits?`
    );
    if (!confirm) return;

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
      <div className="text-center py-10 text-gray-500">Loading rewards...</div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <Card className="mb-8 shadow-lg bg-white/80 backdrop-blur-md border-blue-100">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">
            🎁 Rewards & Credit Shop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Your Current Credits</p>
              <h2 className="text-4xl font-bold text-blue-600">
                £{credits.toFixed(2)}
              </h2>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Button
                  disabled={credits < item.credit_cost}
                  onClick={() => handleRedeem(item)}
                  className="w-full"
                >
                  {credits < item.credit_cost ? "Not Enough Credits" : "Redeem"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
