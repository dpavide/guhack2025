"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function WalletDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [userGoal, setUserGoal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Fetch all user-related data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1️⃣ Get authenticated user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        window.location.href = "/login";
        return;
      }

      const userId = authData.user.id;

      // 2️⃣ Fetch user profile (includes credits)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) console.error("Profile error:", profileError);

      // 3️⃣ Fetch payments + related bills
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          id,
          amount_paid,
          status,
          created_at,
          bills (
            id,
            title,
            amount,
            due_date
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (paymentError) console.error("Payments error:", paymentError);

      // 4️⃣ Fetch redemptions (if exists)
      const { data: redemptionData, error: redemptionError } = await supabase
        .from("redemptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (redemptionError) console.error("Redemptions error:", redemptionError);

      setProfile(profileData);
      setPayments(paymentData || []);
      setRedemptions(redemptionData || []);
      setLoading(false);
    };

    fetchData();

    // ♻️ Optional: auto-refresh dashboard every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Read front-end only goal from localStorage and listen for changes.
  // We only use the stored goal if it matches the current profile user id (or if profile is not loaded yet we still allow it).
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem("user_goal");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!profile?.id || parsed.user_id === profile.id) {
          setUserGoal(parsed);
        }
      } catch (e) {
        console.error("Failed to parse user_goal from localStorage", e);
      }
    };

    load();

    const handler = (ev: any) => {
      const detail = ev?.detail ?? null;
      if (!detail) return;
      if (!profile?.id || detail.user_id === profile.id) setUserGoal(detail);
    };

    window.addEventListener("goalChanged", handler as EventListener);
    return () => window.removeEventListener("goalChanged", handler as EventListener);
  }, [profile?.id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-white">
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-lg font-medium"
          >
            Loading your dashboard...
          </motion.p>
        </motion.div>
      </div>
    );

  const currentCredits = profile?.credits || 0;
  const targetProgress = userGoal 
    ? Math.min(100, (currentCredits / userGoal.credit_goal) * 100)
    : Math.min(100, currentCredits);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-linear-to-b from-blue-50 to-white p-8"
    >
      {/* 👋 Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="mb-8 shadow-lg bg-white/70 backdrop-blur-md border-blue-100">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold flex justify-between items-center">
              <motion.span
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Welcome back, {profile?.full_name || "User"} 👋
              </motion.span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Current Credit Balance</p>
                <motion.h2
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="text-4xl font-bold text-blue-600"
                >
                  £{currentCredits.toFixed(2)}
                </motion.h2>
                {userGoal ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-gray-400 mt-1"
                  >
                    🎯 {Math.min(100, Math.round((currentCredits / userGoal.credit_goal) * 100))}% towards {userGoal.item_name}
                  </motion.p>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-gray-400 mt-1"
                  >
                    🎯 Visit rewards to set a goal
                  </motion.p>
                )}
              </div>
              <div className="w-1/3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${targetProgress}%` }}
                      transition={{
                        duration: 1.5,
                        delay: 0.6,
                        ease: "easeOut"
                      }}
                      className="h-full bg-linear-to-r from-blue-500 to-blue-600 rounded-full"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 🧭 Tabs Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="history">
        <TabsList className="mb-4">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Credits</TabsTrigger>
        </TabsList>

        {/* 💳 Payment History Tab */}
        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No payments found yet 💸
                </p>
              ) : (
                <table className="w-full text-left text-gray-600">
                  <thead>
                    <tr className="border-b text-sm text-gray-500">
                      <th>Date</th>
                      <th>Bill</th>
                      <th>Amount Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="border-b hover:bg-blue-50"
                      >
                        <td>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>{p.bills?.title || "Unknown"}</td>
                        <td>£{p.amount_paid.toFixed(2)}</td>
                        <td>
                          <span
                            className={`font-medium ${
                              p.status === "success"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🎁 Redeem Credits Tab */}
        <TabsContent value="redeem">
          {redemptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No redemptions yet 🎉
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {redemptions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow border-blue-100">
                    <CardHeader>
                      <CardTitle className="text-lg">{r.redemption_type}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-500 mb-2">{r.description}</p>
                      <p className="font-semibold">Cost: £{r.amount}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
