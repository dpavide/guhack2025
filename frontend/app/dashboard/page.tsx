"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function WalletDashboard() {
  const [user, setUser] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [perks, setPerks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) {
        window.location.href = "/login";
        return;
      }

      // Fetch user info
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.user.id)
        .single();

      // Fetch payments
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", authUser.user.id)
        .order("date", { ascending: false });

      // Fetch perks
      const { data: perkData } = await supabase.from("perks").select("*");

      setUser(userData);
      setPayments(paymentData || []);
      setPerks(perkData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      {/* Header */}
      <Card className="mb-8 shadow-lg bg-white/70 backdrop-blur-md border-blue-100">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex justify-between items-center">
            <span>Welcome back, {user?.name || "User"} 👋</span>
            <Button variant="outline" className="hover:bg-blue-100">
              Earn More Credits
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Current Reward Balance</p>
              <h2 className="text-4xl font-bold text-blue-600">£{user?.credits?.toFixed(2) || 0}</h2>
              <p className="text-sm text-gray-400 mt-1">🎯 {user?.progress || 0}% towards next goal</p>
            </div>
            <div className="w-1/3">
              <Progress value={user?.progress || 0} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList className="mb-4">
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="redeem">Redeem Credits</TabsTrigger>
        </TabsList>

        {/* Payment History */}
        <TabsContent value="history">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-left text-gray-600">
                <thead>
                  <tr className="border-b text-sm text-gray-500">
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Credits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b hover:bg-blue-50"
                    >
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td>{p.type}</td>
                      <td>£{p.amount}</td>
                      <td className="text-green-600">+£{p.credits}</td>
                      <td>
                        <span className="text-green-500 font-medium">✅ {p.status}</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redeem Credits */}
        <TabsContent value="redeem">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {perks.map((perk, i) => (
              <motion.div
                key={perk.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow border-blue-100">
                  <CardHeader>
                    <CardTitle className="text-lg">{perk.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 mb-2">{perk.description}</p>
                    <Button
                      disabled={user.credits < perk.cost}
                      onClick={() => alert(`Redeemed ${perk.title} for £${perk.cost}`)}
                      className="w-full"
                    >
                      Redeem for £{perk.cost}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
