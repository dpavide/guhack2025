"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function WalletDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
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

      // 4️⃣ Fetch credit history from credit_log table
      const { data: creditLogData, error: creditLogError } = await supabase
        .from("credit_log")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (creditLogError) console.error("Credit log error:", creditLogError);

      setProfile(profileData);
      setPayments(paymentData || []);
      setCreditHistory(creditLogData || []);
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
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 py-10"
    >
      <div className="mx-auto max-w-6xl px-4 space-y-10">
        {/* Header Summary Card */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-sm bg-white/80 backdrop-blur-md border border-indigo-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold flex flex-wrap gap-2 items-center">
                <motion.span
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                >
                  Welcome back, {profile
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User"
                    : "User"}
                </motion.span>
                <span className="text-sm text-gray-400 font-normal">Splitr Dashboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Credits</p>
                <motion.h2
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                  className="text-3xl font-bold text-indigo-600"
                >
                  {currentCredits.toFixed(2)}
                </motion.h2>
                {userGoal ? (
                  <p className="text-xs text-gray-500">Goal Progress: {Math.min(100, Math.round((currentCredits / userGoal.credit_goal) * 100))}% - {userGoal.item_name}</p>
                ) : (
                  <p className="text-xs text-gray-400">Set a goal on the Rewards page</p>
                )}
              </div>

              <div className="md:col-span-1 lg:col-span-2 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500">Progress</span>
                  <span className="text-xs text-gray-400">{targetProgress.toFixed(1)}%</span>
                </div>
                <div className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${targetProgress}%` }}
                    transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                  />
                </div>
                {userGoal && (
                  <p className="mt-2 text-[11px] text-gray-500">Need {Math.max(0, (userGoal.credit_goal - currentCredits)).toFixed(2)} more credits to reach goal</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="space-y-6"
        >
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="mb-2">
              <TabsTrigger value="history">Payments</TabsTrigger>
              <TabsTrigger value="credits">Credit Changes</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="focus:outline-none">
              <Card className="shadow-sm border border-slate-200/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No payments yet 💸</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-gray-600 border-y">
                            <th className="py-2 px-3 text-left font-medium">Date</th>
                            <th className="py-2 px-3 text-left font-medium">Bill</th>
                            <th className="py-2 px-3 text-left font-medium">Amount</th>
                            <th className="py-2 px-3 text-left font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payments.map((p) => (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className="hover:bg-indigo-50/60"
                            >
                              <td className="py-2 px-3 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="py-2 px-3">{p.bills?.title || "Unknown"}</td>
                              <td className="py-2 px-3 font-medium">£{p.amount_paid.toFixed(2)}</td>
                              <td className="py-2 px-3">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${p.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.status}</span>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credits" className="focus:outline-none">
              <Card className="shadow-sm border border-slate-200/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Credit Ledger</CardTitle>
                </CardHeader>
                <CardContent>
                  {creditHistory.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No credit changes yet 💰</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-gray-600 border-y">
                            <th className="py-2 px-3 text-left font-medium">Date</th>
                            <th className="py-2 px-3 text-left font-medium">Type</th>
                            <th className="py-2 px-3 text-left font-medium">Change</th>
                            <th className="py-2 px-3 text-left font-medium">Balance After</th>
                            <th className="py-2 px-3 text-left font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {creditHistory.map((log) => {
                            const changeAmount = Number(log.change_amount || 0);
                            const isPositive = changeAmount > 0;
                            const amount = Math.abs(changeAmount);
                            return (
                              <motion.tr
                                key={log.log_id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="hover:bg-indigo-50/60"
                              >
                                <td className="py-2 px-3 whitespace-nowrap">{new Date(log.created_at).toLocaleDateString()}</td>
                                <td className="py-2 px-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isPositive ? 'Earned' : 'Spent'}</span>
                                </td>
                                <td className={`py-2 px-3 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>{isPositive ? '+' : '-'}£{amount.toFixed(2)}</td>
                                <td className="py-2 px-3 font-medium">£{Number(log.balance_after || 0).toFixed(2)}</td>
                                <td className="py-2 px-3 text-gray-600">{log.source_type === 'payment' ? 'Payment reward' : log.source_type === 'redemption' ? 'Reward redemption' : (log.source_type || 'Transaction')}</td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}