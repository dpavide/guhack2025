"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchBills = async () => {
      setLoading(true);

      // Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in", userError);
        setLoading(false);
        return;
      }

      setUser(user);

      // Fetch all bills for that user
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (error) console.error("Error fetching bills:", error);
      else setBills(data || []);

      setLoading(false);
    };

    fetchBills();
  }, []);

  // Handle paying a specific bill
  const handlePayment = async (bill: any) => {
    if (!user) return;

    // 1. Ensure profile exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      alert("Profile missing. Cannot pay bill.");
      return;
    }

    // 2. Mark the bill as paid
    const { error: billError } = await supabase
      .from("bills")
      .update({ status: "paid" })
      .eq("id", bill.id);

    if (billError) {
      console.error("Payment failed:", billError);
      alert("Payment failed. Try again.");
      return;
    }

    // 3. Insert into payments
    const { error: paymentError } = await supabase.from("payments").insert([
      {
        user_id: user.id,
        bill_id: bill.id,
        amount_paid: bill.amount,
        status: "success",
      },
    ]);

    if (paymentError) {
      console.error("Failed to record payment:", paymentError);
      alert("Payment was made, but could not record transaction.");
    }

    // 4. Update local bills state
    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? { ...b, status: "paid" } : b))
    );

  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading your bills...</p>
      </div>
    );

  if (!bills.length)
    return (
      <div className="flex items-center justify-center h-screen">
        <p>No bills found 🎉</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Your Bills
        </h1>

        <div className="space-y-6">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              className={`shadow-lg backdrop-blur-md ${
                bill.status === "paid"
                  ? "bg-green-50 border-green-200"
                  : "bg-white/70 border-blue-100"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{bill.title}</p>
                    <p className="text-2xl font-bold text-gray-800">
                      GBP {bill.amount.toFixed(2)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Due</p>
                    <p className="text-lg font-medium text-gray-800">
                      {new Date(bill.due_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  {bill.status === "unpaid" ? (
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={() => handlePayment(bill)}
                    >
                      Pay now
                    </Button>
                  ) : (
                    <Button disabled className="flex-1" size="lg">
                      Paid
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1" size="lg">
                    View details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
