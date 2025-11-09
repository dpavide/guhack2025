"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function WalletDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [userGoal, setUserGoal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // State for Gemini analysis
  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
            due_date,
            created_at
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
    return () =>
      window.removeEventListener("goalChanged", handler as EventListener);
  }, [profile?.id]);

  // Handler function to call our Next.js API route
  const handleAnalyzeSpending = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setInsights(null);

    // Prepare the data for the AI. We already have it in state!
    const spendingData = payments
      .filter((p) => p.status === "success") // Only analyze successful payments
      .map((p) => ({
        amount: p.amount_paid,
        category: p.bills?.title || "Uncategorized", // Use bill title as category
        date: p.created_at,
      }));

    if (spendingData.length === 0) {
      setAnalysisError("You have no successful payments to analyze yet.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: spendingData }), // Send the data
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch insights");
      }

      const data = await response.json();
      setInsights(data);
    } catch (err: any) {
      setAnalysisError(err.message);
    }

    setIsAnalyzing(false);
  };

  if (loading) {
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
  }

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
      {/* ... (Your existing Header Card - no changes) ... */}
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
                Welcome back,{" "}
                {profile
                  ? `${profile.first_name || ""} ${
                      profile.last_name || ""
                    }`.trim() || "User"
                  : "User"}{" "}
                👋
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
                    🎯{" "}
                    {Math.min(
                      100,
                      Math.round((currentCredits / userGoal.credit_goal) * 100)
                    )}
                    % towards {userGoal.item_name}
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
                        ease: "easeOut",
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
            <TabsTrigger value="credits">Credit History</TabsTrigger>
          </TabsList>

          {/* 💳 Payment History Tab */}
          <TabsContent value="history">
            {/* ✨ NEW: AI Spending Analysis Card */}
            <Card className="mb-6 shadow-sm border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg">AI Spending Insights</CardTitle>
              </CardHeader>
              <CardContent>
                {insights && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-700">Summary</h4>
                      <p className="text-gray-600">{insights.summary}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        Top Spending Categories
                      </h4>
                      <ul className="list-disc list-inside text-gray-600">
                        {insights.topCategories.map((category: string) => (
                          <li key={category}>{category}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-700">
                        ✨ Actionable Tip
                      </h4>
                      <p className="text-gray-600">{insights.tip}</p>
                    </div>
                  </motion.div>
                )}

                {analysisError && (
                  <p className="text-red-500">{analysisError}</p>
                )}

                <Button
                  onClick={handleAnalyzeSpending}
                  disabled={isAnalyzing}
                  className="mt-4"
                >
                  {isAnalyzing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isAnalyzing
                    ? "Analyzing..."
                    : insights
                    ? "Re-analyze Spending"
                    : "Analyze My Spending"}
                </Button>
              </CardContent>
            </Card>

            {/* Your existing Recent Payments Card */}
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
                          <td>
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
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

          {/* 💰 Credit History Tab */}
          {/* 💰 Credit History Tab */}
          <TabsContent value="credits">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Credit Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {creditHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No credit transactions found yet 💰
                  </p>
                ) : (
                  <table className="w-full text-left text-gray-600">
                    <thead>
                      <tr className="border-b text-sm text-gray-500">
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Balance After</th>
                        <th>Multiplier</th>
                        <th>Reason</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditHistory.map((log) => {
                        const changeAmount = Number(log.change_amount || 0);
                        const isPositive = changeAmount > 0;
                        const amount = Math.abs(changeAmount);
                        
                        // Build a lookup for payments by id for enrichment
                        const payment = payments.find((p) => p.id === log.source_id);
                        const bill = payment?.bills;

                        // Helper computations for multiplier and reason (front-end only)
                        const dayMs = 1000 * 60 * 60 * 24;
                        let multiplierDisplay: string | null = null;
                        let reasonDisplay: string | null = null;

                        if (log.source_type === "payment" && payment && bill) {
                          const baseRate = 0.05; // must match bills page base rate
                          const baseCredit = Math.round((payment.amount_paid * baseRate) * 100) / 100;
                          // Multiplier only meaningful for non-negative rewards; for penalties, show x0.00
                          if (baseCredit > 0) {
                            if (changeAmount >= 0) {
                              const effectiveMultiplier = changeAmount / baseCredit;
                              multiplierDisplay = `x${effectiveMultiplier.toFixed(2)}`;
                            } else {
                              multiplierDisplay = `x0.00`;
                            }
                          } else {
                            multiplierDisplay = "-";
                          }

                          const payDate = new Date(payment.created_at);
                          const dueDate = new Date(bill.due_date);
                          // Normalize to local midnight compare, but a simple day diff is enough for UI
                          const diffDays = Math.ceil((payDate.getTime() - dueDate.getTime()) / dayMs);
                          if (diffDays < 0) {
                            reasonDisplay = `Early by ${Math.abs(diffDays)} day(s)`;
                          } else if (diffDays === 0) {
                            reasonDisplay = "On due date";
                          } else {
                            reasonDisplay = `Late by ${diffDays} day(s)`;
                          }

                          // If penalty occurred (negative change), append penalty amount detail
                          if (changeAmount < 0 && baseCredit > 0) {
                            const penalty = Math.max(0, baseCredit - changeAmount); // since changeAmount is negative
                            reasonDisplay = `${reasonDisplay} • Penalty £${penalty.toFixed(2)}`;
                          }
                        }

                        return (
                          <motion.tr
                            key={log.log_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="border-b hover:bg-blue-50"
                          >
                            <td className="py-3">
                              {new Date(log.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isPositive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {isPositive ? "➕ Earned" : "➖ Spent"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`font-semibold ${
                                  isPositive
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {isPositive ? "+" : "-"}£{amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="font-medium">
                              £{Number(log.balance_after || 0).toFixed(2)}
                            </td>
                            <td className="text-sm text-gray-700">
                              {multiplierDisplay ?? (log.source_type === "payment" ? "x1.00" : "-")}
                            </td>
                            <td className="text-sm text-gray-600">
                              {reasonDisplay ?? (log.source_type === "payment" ? "—" : "—")}
                            </td>
                            <td className="text-sm text-gray-600">
                              {log.source_type === "payment"
                                ? "Payment reward"
                                : log.source_type === "redemption"
                                ? "Reward redemption"
                                : log.source_type || "Transaction"}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}