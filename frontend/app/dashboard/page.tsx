"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { motion } from "framer-motion";

export default function WalletDashboard() {
  // Mock data
  const [user] = useState({
    name: "Sophie",
    credits: 73.5,
    progress: 73,
  });

  const payments = [
    { date: "03 Nov 2025", type: "Rent", amount: 550, credits: 27.5, status: "Paid" },
    { date: "18 Oct 2025", type: "Electricity", amount: 68, credits: 3.4, status: "Paid" },
    { date: "10 Oct 2025", type: "Wi-Fi", amount: 25, credits: 1.25, status: "Paid" },
    { date: "01 Oct 2025", type: "Water", amount: 36, credits: 1.8, status: "Paid" },
    { date: "20 Sep 2025", type: "Gas", amount: 54, credits: 2.7, status: "Paid" },
    { date: "15 Sep 2025", type: "Rent", amount: 550, credits: 27.5, status: "Paid" },
    { date: "05 Sep 2025", type: "Electricity", amount: 60, credits: 3.0, status: "Paid" },
  ];

  const perks = [
    { title: "Apply to Rent", desc: "Use £10 credit to reduce next month's rent payment.", cost: 10 },
    { title: "Coffee Voucher", desc: "Grab your morning coffee with £5 credit at Caffè Nero.", cost: 5 },
    { title: "Gym Pass", desc: "Access to the university gym for 3 days with £8 credit.", cost: 8 },
    { title: "Uber Ride Credit", desc: "Get £7 off your next Uber trip.", cost: 7 },
    { title: "Amazon Gift Card", desc: "Redeem £15 Amazon gift card.", cost: 15 },
    { title: "Spotify Premium", desc: "1-month Spotify Premium subscription.", cost: 10 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      {/* Header */}
      <Card className="mb-8 shadow-lg bg-white/70 backdrop-blur-md border-blue-100">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold flex justify-between items-center">
            <span>Welcome back, {user.name} 👋</span>
            <Button variant="outline" className="hover:bg-blue-100">
              Earn More Credits
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Current Reward Balance</p>
              <h2 className="text-4xl font-bold text-blue-600">£{user.credits.toFixed(2)}</h2>
              <p className="text-sm text-gray-400 mt-1">🎯 {user.progress}% towards next reward goal</p>
            </div>
            <div className="w-1/3">
              <Progress value={user.progress} className="h-3" />
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
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b hover:bg-blue-50"
                    >
                      <td>{p.date}</td>
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
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow border-blue-100">
                  <CardHeader>
                    <CardTitle className="text-lg">{perk.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 mb-2">{perk.desc}</p>
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
