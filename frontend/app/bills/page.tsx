"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { motion } from "framer-motion";

interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface Friend {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface BillParticipant {
  id: string;
  user_id: string;
  amount_owed: number;
  has_paid: boolean;
  paid_at?: string;
  profile: Profile;
}

interface Bill {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
  description?: string;
  receiver_bank?: string;
  receiver_name?: string;
  category?: string;
  created_at: string;
  bill_participants: BillParticipant[];
}

export default function BillsPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitingBill, setInvitingBill] = useState<Bill | null>(null);
  const [filterType, setFilterType] = useState<"all" | "inviter" | "invited" | "history">("all");
  const [loading, setLoading] = useState(true);
  
  // Create Bill Form State
  const [newBill, setNewBill] = useState({
    name: "",
    totalAmount: "",
    dueDate: "",
    description: "",
    category: "",
    receiverBank: "",
    receiverName: "",
  });
  
  // Creator's share amount
  const [creatorShare, setCreatorShare] = useState("");
  
  // Split participants with custom amounts
  const [splitParticipants, setSplitParticipants] = useState<Array<{
    userId: string;
    name: string;
    avatar: string;
    amount: string;
  }>>([]);

  // Fetch current user and initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setCurrentUserId(user.id);
          await Promise.all([
            fetchBills(user.id),
            fetchFriends(user.id)
          ]);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Fetch bills
  const fetchBills = async (userId: string) => {
    try {
      // Fetch bills where user is creator or participant
      const { data: createdBills, error: createdError } = await supabase
        .from("bills")
        .select(`
          *,
          bill_participants (
            id,
            user_id,
            amount_owed,
            has_paid,
            paid_at,
            profile:profiles (
              id,
              username,
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq("user_id", userId);

      if (createdError) throw createdError;

      // Fetch bills where user is a participant
      const { data: participantBills, error: participantError } = await supabase
        .from("bill_participants")
        .select(`
          bill:bills (
            *,
            bill_participants (
              id,
              user_id,
              amount_owed,
              has_paid,
              paid_at,
              profile:profiles (
                id,
                username,
                first_name,
                last_name,
                avatar_url
              )
            )
          )
        `)
        .eq("user_id", userId);

      if (participantError) throw participantError;

      // Combine and deduplicate bills
      const allBills = [
        ...(createdBills || []),
        ...(participantBills?.map(pb => pb.bill).filter(Boolean) || [])
      ];

      const uniqueBills = Array.from(
        new Map(allBills.map(bill => [bill.id, bill])).values()
      );

      setBills(uniqueBills as Bill[]);
    } catch (error) {
      console.error("Error fetching bills:", error);
    }
  };

  // Fetch friends (only accepted friends)
  const fetchFriends = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("friends")
        .select(`
          friend:profiles!friends_friend_id_fkey (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq("user_id", userId)
        .eq("status", "accepted");

      if (error) throw error;

      const friendsList = data?.map(d => d.friend).filter(Boolean).flat() || [];
      setFriends(friendsList as unknown as Friend[]);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  // Helper functions
  const getUserDisplayName = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username || "Unknown";
  };

  const getInitials = (profile: Profile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  const hasUserPaid = (bill: Bill) => {
    if (!currentUserId) return false;
    const currentUser = bill.bill_participants?.find(p => p.user_id === currentUserId);
    return currentUser?.has_paid || false;
  };

  const getPaidCount = (bill: Bill) => {
    return bill.bill_participants?.filter(p => p.has_paid).length || 0;
  };

  const getTotalPeople = (bill: Bill) => {
    return bill.bill_participants?.length || 0;
  };

  const isCreator = (bill: Bill) => {
    return bill.user_id === currentUserId;
  };

  const handlePayClick = async (e: React.MouseEvent, billId: string) => {
      e.stopPropagation();
      if (!currentUserId) return;

      // We must declare creditToAdd outside the nested try block 
      // to use it in the final alert.
      let creditToAdd = 0; 
      let participant: any = null; // Declare participant outside try/catch

      try {
        // Find the participant record for current user
        const bill = bills.find(b => b.id === billId);
        participant = bill?.bill_participants?.find(p => p.user_id === currentUserId);
        
        if (!participant) {
          alert("Error: Participant record not found");
          return;
        }

        // Update participant payment status
        const { error: updateError } = await supabase
          .from("bill_participants")
          .update({
            has_paid: true,
            paid_at: new Date().toISOString()
          })
          .eq("id", participant.id);

        if (updateError) throw updateError;

        // Create payment record (This should be the first DB operation to use the ID later)
        // We need to use .select("id").single() here to get the payment ID immediately.
        const { data: insertedPayment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            user_id: currentUserId,
            bill_id: billId,
            amount_paid: participant.amount_owed,
            status: "success"
          })
          .select("id")
          .single(); // Use the inserted ID directly

        if (paymentError) throw paymentError;
        
        const paymentId = insertedPayment.id;
        
        // 3️⃣ Add 5% of payment as credits to profile
        creditToAdd = participant.amount_owed * 0.05; // Set the amount here

        try {
          // Get current credits
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", currentUserId)
            .single();

          if (profileError) throw profileError;

          const newCredits = (profile?.credits || 0) + creditToAdd;

          // Log to credit_log first (using the insertedPayment ID)
          const { error: logError } = await supabase.from("credit_log").insert([
            {
              user_id: currentUserId,
              source_type: "payment",
              source_id: paymentId, // 🔑 Use the directly inserted ID
              change_amount: creditToAdd,
              balance_after: newCredits,
            },
          ]);

          if (logError) {
            console.error("Error logging credit transaction:", logError);
          }

          // Update profile credits
          const { error: updateCreditsError } = await supabase
            .from("profiles")
            .update({ credits: newCredits })
            .eq("id", currentUserId);

          if (updateCreditsError) throw updateCreditsError;
        } catch (error) {
          console.error("Error adding credits:", error);
          alert("Payment succeeded, but failed to add credits.");
        }

        // Check if all participants have paid
        const { data: allParticipants, error: participantsError } = await supabase
          .from("bill_participants")
          .select("has_paid")
          .eq("bill_id", billId);

        if (participantsError) throw participantsError;

        // If all participants have paid, update bill status to 'paid'
        const allPaid = allParticipants?.every(p => p.has_paid) || false;
        if (allPaid) {
          const { error: billUpdateError } = await supabase
            .from("bills")
            .update({ status: "paid" })
            .eq("id", billId);

          if (billUpdateError) throw billUpdateError;
        }

        await fetchBills(currentUserId);
      } catch (error) {
        console.error("Error processing payment:", error);
        alert("Failed to process payment. Please try again.");
      }
    };

  const handleDetailsClick = (bill: Bill) => {
    setSelectedBill(bill);
    setIsDialogOpen(true);
  };

  const handleAddParticipant = (friend: Friend) => {
    if (!splitParticipants.find(p => p.userId === friend.id)) {
      const currentTotal = parseFloat(newBill.totalAmount) || 0;
      const newParticipantCount = splitParticipants.length + 1;
      const averageAmount = currentTotal > 0 ? (currentTotal / newParticipantCount).toFixed(2) : "";
      
      setSplitParticipants([...splitParticipants, {
        userId: friend.id,
        name: getUserDisplayName(friend),
        avatar: getInitials(friend),
        amount: averageAmount
      }]);
    }
  };

  const handleRemoveParticipant = (userId: string) => {
    const updatedParticipants = splitParticipants.filter(p => p.userId !== userId);
  
    if (updatedParticipants.length > 0 && newBill.totalAmount) {
      const currentTotal = parseFloat(newBill.totalAmount);
      const averageAmount = (currentTotal / updatedParticipants.length).toFixed(2);
      setSplitParticipants(updatedParticipants.map(p => ({
        ...p,
        amount: averageAmount
      })));
    } else {
      setSplitParticipants(updatedParticipants);
    }
  };

  const handleUpdateAmount = (userId: string, amount: string) => {
    setSplitParticipants(splitParticipants.map(p => 
      p.userId === userId ? { ...p, amount } : p
    ));
  };

  const handleCreateBill = async () => {
    if (!currentUserId) {
      alert("⚠️ Please log in to create a bill");
      return;
    }

    if (!newBill.name || !newBill.totalAmount || !newBill.dueDate) {
      alert("⚠️ Please fill in all required fields (Name, Amount, Due Date)");
      return;
    }

    // Validate due date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(newBill.dueDate);
    if (selectedDate < today) {
      alert("⚠️ Due date cannot be in the past. Please select today or a future date.");
      return;
    }

    if (!creatorShare) {
      alert("⚠️ Please enter your share amount");
      return;
    }

    if (splitParticipants.length === 0) {
      alert("⚠️ Please add at least one participant to split the bill");
      return;
    }

    const billTotal = parseFloat(newBill.totalAmount);
    if (isNaN(billTotal) || billTotal <= 0) {
      alert("⚠️ Please enter a valid amount greater than 0");
      return;
    }

    const creatorAmount = parseFloat(creatorShare);
    if (isNaN(creatorAmount) || creatorAmount <= 0) {
      alert("⚠️ Please enter a valid amount for your share");
      return;
    }

    const othersTotal = splitParticipants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalAssigned = creatorAmount + othersTotal;
    
    if (Math.abs(totalAssigned - billTotal) > 0.01) {
      alert(`⚠️ Total assigned (£${totalAssigned.toFixed(2)}) must equal bill amount (£${billTotal.toFixed(2)})\nYour share: £${creatorAmount.toFixed(2)}\nOthers: £${othersTotal.toFixed(2)}`);
      return;
    }

    const hasEmptyAmount = splitParticipants.some(p => !p.amount || parseFloat(p.amount) <= 0);
    if (hasEmptyAmount) {
      alert("⚠️ All participants must have a valid amount greater than 0");
      return;
    }

    try {
      // Create the bill
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert({
          user_id: currentUserId,
          title: newBill.name,
          amount: billTotal,
          due_date: newBill.dueDate,
          description: newBill.description || null,
          category: newBill.category || null,
          receiver_bank: newBill.receiverBank || null,
          receiver_name: newBill.receiverName || null,
          status: "unpaid"
        })
        .select()
        .single();

      if (billError) {
        console.error("Bill creation error:", billError);
        alert(`Failed to create bill: ${billError.message}`);
        return;
      }

      if (!billData) {
        alert("Failed to create bill: No data returned");
        return;
      }

      // Create participant records including the creator
      const participantRecords = [
        // Creator as participant (automatically paid)
        {
          bill_id: billData.id,
          user_id: currentUserId,
          amount_owed: creatorAmount,
          has_paid: true,
          paid_at: new Date().toISOString()
        },
        // Other participants
        ...splitParticipants.map(p => ({
          bill_id: billData.id,
          user_id: p.userId,
          amount_owed: parseFloat(p.amount),
          has_paid: false
        }))
      ];

      const { error: participantsError } = await supabase
        .from("bill_participants")
        .insert(participantRecords);

      if (participantsError) {
        console.error("Participants creation error:", participantsError);
        alert(`Failed to add participants: ${participantsError.message}`);
        return;
      }

      // Create payment record for the creator
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: currentUserId,
          bill_id: billData.id,
          amount_paid: creatorAmount,
          status: "success"
        });

      if (paymentError) {
        console.error("Payment creation error:", paymentError);
        // Don't return here, payment record is optional
      }

      // Refresh bills
      await fetchBills(currentUserId);
  
      setNewBill({
        name: "",
        totalAmount: "",
        dueDate: "",
        description: "",
        category: "",
        receiverBank: "",
        receiverName: "",
      });
      setCreatorShare("");
      setSplitParticipants([]);
      setIsCreateDialogOpen(false);
      
      alert(`✅ Bill "${newBill.name}" created successfully!\nYour share: £${creatorAmount.toFixed(2)} (paid)\nOther participants: ${splitParticipants.length}`);
    } catch (error) {
      console.error("Error creating bill:", error);
      alert(`Failed to create bill. Please try again.`);
    }
  };

  // Selecting bills based on filter
  const filteredBills = bills.filter(bill => {
    const paidCount = getPaidCount(bill);
    const totalPeople = getTotalPeople(bill);
    const isFullyPaid = bill.status === "paid" || paidCount === totalPeople;
    
    if (filterType === "inviter") {
      // Bills created by current user that are not fully paid
      return isCreator(bill) && !isFullyPaid;
    } else if (filterType === "invited") {
      // Bills where user is participant (not creator) and not fully paid
      return !isCreator(bill) && !isFullyPaid;
    } else if (filterType === "history") {
      // Bills that are fully paid
      return isFullyPaid;
    }
    return true; // all
  });

  const handleInviteClick = (e: React.MouseEvent, bill: Bill) => {
    e.stopPropagation();
    setInvitingBill(bill);
    setIsInviteDialogOpen(true);
  };

  const handleSendInvitation = (participantIds: string[]) => {
    if (participantIds.length === 0) {
      alert("Please select at least one participant to invite");
      return;
    }

    const participantNames = invitingBill?.bill_participants
      ?.filter(p => participantIds.includes(p.user_id) && !p.has_paid)
      .map(p => getUserDisplayName(p.profile))
      .join(", ");
    
    alert(`✅ Invitation sent to: ${participantNames}`);
    setIsInviteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
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
            Loading bills...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Bills</h1>
        </div>

        {/* Filter Options and Create Button Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setFilterType("all")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === "all" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("inviter")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === "inviter" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Inviter
            </button>
            <button
              onClick={() => setFilterType("invited")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === "invited" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Invited
            </button>
            <button
              onClick={() => setFilterType("history")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filterType === "history" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              History
            </button>
          </div>
          
          {/* Create Bill Button */}
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md"
          >
            + Create Bill
          </button>
        </div>

        {/* Bills List */}
        <div className="space-y-4">
          {filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No bills found</h3>
              <p className="text-gray-500">
                {filterType === "inviter" && "You haven't created any active bills yet"}
                {filterType === "invited" && "You don't have any active invited bills"}
                {filterType === "history" && "No completed bills in history"}
                {filterType === "all" && "No bills available"}
              </p>
            </div>
          ) : (
            filteredBills.map((bill) => {
              const paidCount = getPaidCount(bill);
              const totalPeople = getTotalPeople(bill);
              const isFullyPaid = bill.status === "paid" || paidCount === totalPeople;
              
              return (
            <Card
              key={bill.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDetailsClick(bill)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between">
                  {/* Left Side */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold text-gray-800">
                        {bill.title}
                      </h3>
                      {/* Status Badge */}
                      {isFullyPaid && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          PAID
                        </span>
                      )}
                      {/* Category Badge */}
                      {bill.category && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full capitalize">
                          {bill.category}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      £{Number(bill.amount).toFixed(2)}
                    </p>
                    
                    {/* Description */}
                    {bill.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {bill.description}
                      </p>
                    )}

                    {/* Distinguish the role of user */}
                    {isCreator(bill) ? (
                      paidCount < totalPeople ? (
                        <button
                          onClick={(e) => handleInviteClick(e, bill)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          Invite Payers
                        </button>
                      ) : (
                        <p className="text-sm text-green-600 font-medium">
                          ✓ All paid
                        </p>
                      )
                    ) : (
                      hasUserPaid(bill) ? (
                        paidCount === totalPeople ? (
                          <p className="text-sm text-green-600 font-medium">
                            ✓ All paid
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {paidCount} / {totalPeople} people paid
                          </p>
                        )
                      ) : (
                        <button
                          onClick={(e) => handlePayClick(e, bill.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Pay
                        </button>
                      )
                    )}
                  </div>

                  {/* Right Side */}
                  <div className="flex flex-col items-end space-y-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="text-lg font-medium text-gray-800">
                        {new Date(bill.due_date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Avatar List */}
                    <div className="flex -space-x-2">
                      {bill.bill_participants?.map((participant) => (
                        <div
                          key={participant.id}
                          className="relative w-10 h-10 rounded-full border-2 border-white overflow-hidden"
                          title={getUserDisplayName(participant.profile)}
                        >
                          {participant.profile.avatar_url ? (
                            <Image
                              src={participant.profile.avatar_url}
                              alt={getUserDisplayName(participant.profile)}
                              fill
                              className={`object-cover rounded-full ${
                                participant.has_paid ? '' : 'opacity-60'
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex items-center justify-center text-white font-semibold ${
                                participant.has_paid
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            >
                              {getInitials(participant.profile)}
                            </div>
                          )}
                          {/* Paid Checkmark Overlay */}
                          {participant.has_paid && (
                            <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Details →
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}))}
        </div>

        {/* Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedBill?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    £{selectedBill?.amount ? Number(selectedBill.amount).toFixed(2) : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="text-lg font-medium">
                    {selectedBill &&
                      new Date(selectedBill.due_date).toLocaleDateString(
                        "en-GB"
                      )}
                  </p>
                </div>
                {selectedBill?.category && (
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="text-lg font-medium capitalize">
                      {selectedBill.category}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`text-lg font-medium ${
                    selectedBill?.status === "paid" ? "text-green-600" : "text-orange-600"
                  }`}>
                    {selectedBill?.status === "paid" ? "Paid" : "Unpaid"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedBill?.description && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{selectedBill.description}</p>
                </div>
              )}

              {/* Receiver Information */}
              {(selectedBill?.receiver_name || selectedBill?.receiver_bank) && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-gray-500 mb-2">Receiver Information</p>
                  <div className="space-y-1">
                    {selectedBill.receiver_name && (
                      <p className="text-sm">
                        <span className="font-medium">Name:</span> {selectedBill.receiver_name}
                      </p>
                    )}
                    {selectedBill.receiver_bank && (
                      <p className="text-sm">
                        <span className="font-medium">Bank:</span> {selectedBill.receiver_bank}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Status */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Payment Status ({selectedBill ? getPaidCount(selectedBill) : 0} /{" "}
                  {selectedBill ? getTotalPeople(selectedBill) : 0})
                </h4>

                {/* Paid People */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-green-600 mb-2">
                    ✓ Paid
                  </p>
                  <div className="space-y-2">
                    {selectedBill?.bill_participants
                      ?.filter(p => p.has_paid)
                      .map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg"
                        >
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-green-500">
                            {participant.profile.avatar_url ? (
                              <Image
                                src={participant.profile.avatar_url}
                                alt={getUserDisplayName(participant.profile)}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-semibold">
                                {getInitials(participant.profile)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">
                              {getUserDisplayName(participant.profile)}
                            </span>
                            <p className="text-sm text-gray-500">
                              £{Number(participant.amount_owed).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Unpaid People */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    ○ Not Paid
                  </p>
                  <div className="space-y-2">
                    {selectedBill?.bill_participants
                      ?.filter(p => !p.has_paid)
                      .map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300">
                            {participant.profile.avatar_url ? (
                              <Image
                                src={participant.profile.avatar_url}
                                alt={getUserDisplayName(participant.profile)}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                                {getInitials(participant.profile)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-800">
                              {getUserDisplayName(participant.profile)}
                            </span>
                            <p className="text-sm text-gray-500">
                              £{Number(participant.amount_owed).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Bill Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create New Bill</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bill Name *
                  </label>
                  <input
                    type="text"
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Electricity Bill"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Amount (£) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBill.totalAmount}
                      onChange={(e) => setNewBill({ ...newBill, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={newBill.dueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Due date must be today or later
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Payment Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receiver Bank
                    </label>
                    <input
                      type="text"
                      value={newBill.receiverBank}
                      onChange={(e) => setNewBill({ ...newBill, receiverBank: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., HSBC"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receiver Name
                    </label>
                    <input
                      type="text"
                      value={newBill.receiverName}
                      onChange={(e) => setNewBill({ ...newBill, receiverName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Recipient name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newBill.category}
                    onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Utilities, Rent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newBill.description}
                    onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional details about this bill"
                    rows={3}
                  />
                </div>
              </div>

              {/* Split Bill - Add Participants */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Split Bill</h3>
                
                {/* Creator's Share */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Your Share (You will pay) *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-medium">£</span>
                    <input
                      type="number"
                      step="0.01"
                      value={creatorShare}
                      onChange={(e) => setCreatorShare(e.target.value)}
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    This amount will be automatically marked as paid when you create the bill
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Friends to Split With
                  </label>
                  {friends.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No friends available. Add friends to split bills with them.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {friends.map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => handleAddParticipant(friend)}
                          disabled={splitParticipants.some(p => p.userId === friend.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            splitParticipants.some(p => p.userId === friend.id)
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}
                        >
                          {getInitials(friend)} {getUserDisplayName(friend)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Participants List with Custom Amounts */}
                {splitParticipants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Assign amounts to each person:
                    </p>
                    {splitParticipants.map(participant => (
                      <div key={participant.userId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {participant.avatar}
                        </div>
                        <span className="flex-1 font-medium">{participant.name}</span>
                        <input
                          type="number"
                          step="0.01"
                          value={participant.amount}
                          onChange={(e) => handleUpdateAmount(participant.userId, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                        <span className="text-gray-500">£</span>
                        <button
                          onClick={() => handleRemoveParticipant(participant.userId)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Your share:</span>
                        <span className="text-lg font-bold text-blue-600">
                          £{creatorShare ? parseFloat(creatorShare).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Others' total:</span>
                        <span className="text-lg font-bold text-gray-600">
                          £{splitParticipants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-300 flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">Total assigned:</span>
                        <span className="text-xl font-bold text-gray-900">
                          £{((parseFloat(creatorShare) || 0) + splitParticipants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)).toFixed(2)}
                        </span>
                      </div>
                      {newBill.totalAmount && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">Bill amount:</span>
                          <span className="text-sm text-gray-500">
                            £{parseFloat(newBill.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBill}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Create Bill
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invite Payers Dialog */}
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Invite Payers - {invitingBill?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Select participants to send payment reminders:
                </p>

                {/* List of unpaid participants */}
                <div className="space-y-2">
                  {invitingBill?.bill_participants
                    ?.filter(p => !p.has_paid)
                    .map((participant) => (
                      <label
                        key={participant.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          data-participant-id={participant.user_id}
                        />
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-gray-300">
                          {participant.profile.avatar_url ? (
                            <Image
                              src={participant.profile.avatar_url}
                              alt={getUserDisplayName(participant.profile)}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                              {getInitials(participant.profile)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {getUserDisplayName(participant.profile)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Amount: £{Number(participant.amount_owed).toFixed(2)}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>

                {invitingBill?.bill_participants?.filter(p => !p.has_paid).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    All participants have paid! 🎉
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsInviteDialogOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-participant-id]');
                    const selectedIds = Array.from(checkboxes)
                      .filter((cb: any) => cb.checked)
                      .map((cb: any) => cb.dataset.participantId);
                    handleSendInvitation(selectedIds);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  disabled={invitingBill?.bill_participants?.filter(p => !p.has_paid).length === 0}
                >
                  Send Invitations
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}