"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabaseClient";
import { validateBankCard, processBankPayment } from "@/lib/bankApi";
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
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [cardDetails, setCardDetails] = useState({
    accountNumber: "", // 16-digit card number
    cardHolderName: "",
    cvv: "",
    expiryDate: ""
  });
  const [cardValidation, setCardValidation] = useState<{
    valid: boolean;
    message: string;
    cardHolderName?: string;
    bankName?: string;
    balance?: number;
    maskedCardNumber?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
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

  // Calculate timing multiplier based on when payment is made
  const calculateTimingMultiplier = (createdAt: string, dueDate: string, paymentDate: Date): number => {
    const created = new Date(createdAt);
    const due = new Date(dueDate);
    const paid = new Date(paymentDate);
    
    // Normalize to midnight for accurate day comparison
    created.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    paid.setHours(0, 0, 0, 0);
    
    const createdTime = created.getTime();
    const dueTime = due.getTime();
    const paidTime = paid.getTime();
    
    // If bill is due today and paid today
    if (paidTime === dueTime) {
      return 1.5;
    }
    
    // If paid before or on due date
    if (paidTime <= dueTime) {
      // Special case: if due today but not created today, use 1.0
      if (paidTime === dueTime && createdTime === dueTime) {
        return 1.0;
      }
      
      const totalWindow = dueTime - createdTime;
      
      // If created and due are the same day, use 1.0 multiplier
      if (totalWindow === 0) {
        return 1.0;
      }
      
      const timeElapsed = paidTime - createdTime;
      const ratio = timeElapsed / totalWindow;
      
      // Linear scale from 1.0 (at creation) to 1.5 (at due date)
      return 1.0 + (ratio * 0.5);
    }
    
    // If paid late (after due date)
    const daysLate = Math.round((paidTime - dueTime) / (24 * 60 * 60 * 1000));
    
    // For late payments: still get base credit (1.0x) but subtract 2 credits per day late
    // Return 1.0 as base multiplier - penalty will be handled separately
    return 1.0;
  };

  const handlePayClick = async (e: React.MouseEvent, bill: Bill) => {
    e.stopPropagation();
    if (!currentUserId) return;

    // Open payment dialog
    setPayingBill(bill);
    setIsPaymentDialogOpen(true);
    setCardDetails({
      accountNumber: "",
      cardHolderName: "",
      cvv: "",
      expiryDate: ""
    });
    setCardValidation(null);
  };

  const handleValidateCard = async () => {
    // Validate all fields are filled
    if (!cardDetails.accountNumber || 
        !cardDetails.cardHolderName || !cardDetails.cvv || !cardDetails.expiryDate) {
      setCardValidation({
        valid: false,
        message: "Please fill in all card details"
      });
      return;
    }

    // Validate card number (16 digits)
    if (!/^\d{16}$/.test(cardDetails.accountNumber.replace(/\s/g, ''))) {
      setCardValidation({
        valid: false,
        message: "Card number must be 16 digits"
      });
      return;
    }

    // Validate CVV (3 digits)
    if (!/^\d{3}$/.test(cardDetails.cvv)) {
      setCardValidation({
        valid: false,
        message: "CVV must be 3 digits"
      });
      return;
    }

    // Validate expiry date format (MM/YY)
    if (!/^\d{2}\/\d{2}$/.test(cardDetails.expiryDate)) {
      setCardValidation({
        valid: false,
        message: "Expiry date must be in format MM/YY (e.g., 12/28)"
      });
      return;
    }

    setIsValidating(true);
    try {
      const validation = await validateBankCard({
        account_number: cardDetails.accountNumber,
        card_holder_name: cardDetails.cardHolderName,
        cvv: cardDetails.cvv,
        expiry_date: cardDetails.expiryDate
      });
      
      setCardValidation({
        valid: validation.valid,
        message: validation.message || "",
        cardHolderName: validation.card_holder_name,
        bankName: validation.bank_name,
        balance: validation.balance,
        maskedCardNumber: validation.masked_card_number
      });
    } catch (error) {
      setCardValidation({
        valid: false,
        message: "Error validating card. Please try again."
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentUserId || !payingBill || !cardValidation?.valid) return;

    const participant = payingBill.bill_participants?.find(p => p.user_id === currentUserId);
    if (!participant) {
      alert("Error: Participant record not found");
      return;
    }

    const amountToPay = participant.amount_owed;

    setIsProcessingPayment(true);
    try {
      // Process payment with bank card
      const paymentResult = await processBankPayment({
        account_number: cardDetails.accountNumber,
        card_holder_name: cardDetails.cardHolderName,
        cvv: cardDetails.cvv,
        expiry_date: cardDetails.expiryDate,
        amount: amountToPay
      });
      
      if (!paymentResult.success) {
        alert(paymentResult.message);
        setIsProcessingPayment(false);
        return;
      }

      // Payment successful, update database
      let creditToAdd = 0;

      // Update participant payment status
      const { error: updateError } = await supabase
        .from("bill_participants")
        .update({
          has_paid: true,
          paid_at: new Date().toISOString()
        })
        .eq("id", participant.id);

      if (updateError) throw updateError;

      // Create payment record
      const { data: insertedPayment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: currentUserId,
          bill_id: payingBill.id,
          amount_paid: participant.amount_owed,
          status: "success"
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;
      
      const paymentId = insertedPayment.id;
      const paymentDate = new Date();
      
      // Calculate timing multiplier based on payment timing
      const timingMultiplier = calculateTimingMultiplier(
        payingBill.created_at,
        payingBill.due_date,
        paymentDate
      );
      
      // Base credit is 5% of payment amount
      const baseCredit = participant.amount_owed * 0.05;
      
      // Apply timing multiplier for early/on-time payments
      let creditReward = Math.round(baseCredit * timingMultiplier * 100) / 100;
      
      // Check if payment is late and apply penalty
      const due = new Date(payingBill.due_date);
      const paid = new Date(paymentDate);
      due.setHours(0, 0, 0, 0);
      paid.setHours(0, 0, 0, 0);
      
      const daysLate = Math.round((paid.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysLate > 0) {
        // For late payments: give base cashback but also subtract penalty
        const latePenalty = daysLate * 2;
        
        // First, add the base cashback reward
        creditToAdd = creditReward;
        
        try {
          // Get current credits
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("credits")
            .eq("id", currentUserId)
            .single();

          if (profileError) throw profileError;

          let currentCredits = profile?.credits || 0;
          
          // Add the cashback reward
          currentCredits += creditReward;

          // Log the cashback reward
          const { error: rewardLogError } = await supabase.from("credit_log").insert([
            {
              user_id: currentUserId,
              source_type: "payment",
              source_id: paymentId,
              change_amount: creditReward,
              balance_after: currentCredits,
            },
          ]);

          if (rewardLogError) {
            console.error("Error logging credit reward:", rewardLogError);
          }
          
          // Now subtract the late penalty
          currentCredits -= latePenalty;

          // Log the late penalty as a separate transaction
          const { error: penaltyLogError } = await supabase.from("credit_log").insert([
            {
              user_id: currentUserId,
              source_type: "late_penalty",
              source_id: paymentId,
              change_amount: -latePenalty,
              balance_after: currentCredits,
            },
          ]);

          if (penaltyLogError) {
            console.error("Error logging late penalty:", penaltyLogError);
          }

          // Update profile credits with final amount
          const { error: updateCreditsError } = await supabase
            .from("profiles")
            .update({ credits: currentCredits })
            .eq("id", currentUserId);

          if (updateCreditsError) throw updateCreditsError;
        } catch (error) {
          console.error("Error processing credits and penalty:", error);
        }
      } else {
        // Not late - just add the reward
        creditToAdd = creditReward;

        try {
        // Get current credits
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("id", currentUserId)
          .single();

        if (profileError) throw profileError;

        const newCredits = (profile?.credits || 0) + creditToAdd;

        // Log to credit_log
        const { error: logError } = await supabase.from("credit_log").insert([
          {
            user_id: currentUserId,
            source_type: "payment",
            source_id: paymentId,
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
        }
      }

      // Check if all participants have paid
      const { data: allParticipants, error: participantsError } = await supabase
        .from("bill_participants")
        .select("has_paid")
        .eq("bill_id", payingBill.id);

      if (participantsError) throw participantsError;

      // If all participants have paid, update bill status to 'paid'
      const allPaid = allParticipants?.every(p => p.has_paid) || false;
      if (allPaid) {
        const { error: billUpdateError } = await supabase
          .from("bills")
          .update({ status: "paid" })
          .eq("id", payingBill.id);

        if (billUpdateError) throw billUpdateError;
      }

      await fetchBills(currentUserId);
      
      // Close dialog and show success message
      setIsPaymentDialogOpen(false);
      alert(`✅ Payment of £${amountToPay.toFixed(2)} processed successfully!\nYou earned ${creditToAdd.toFixed(2)} credits!`);
      
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsProcessingPayment(false);
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

  // 排序规则：
  // 1) 我没付 (userPaid=false)
  // 2) 我付了但别人没付 (userPaid=true 且 !fullyPaid)
  // 3) 全部付清 (fullyPaid)
  // 同组内按到期日升序
  const sortedBills = [...filteredBills].sort((a, b) => {
    const aPaidCount = getPaidCount(a);
    const aTotal = getTotalPeople(a);
    const aFullyPaid = a.status === 'paid' || aPaidCount === aTotal;
    const bPaidCount = getPaidCount(b);
    const bTotal = getTotalPeople(b);
    const bFullyPaid = b.status === 'paid' || bPaidCount === bTotal;

    const aUserPaid = hasUserPaid(a);
    const bUserPaid = hasUserPaid(b);

    // 计算优先级数值，数值越小越靠前
    const priority = (bill: Bill, fullyPaid: boolean, userPaid: boolean) => {
      if (fullyPaid) return 3; // 全部付清最后
      if (!userPaid) return 1; // 我没付最前
      return 2; // 我付了但别人没付居中
    };

    const aPriority = priority(a, aFullyPaid, aUserPaid);
    const bPriority = priority(b, bFullyPaid, bUserPaid);

    if (aPriority !== bPriority) return aPriority - bPriority;

    // 同组内按 due_date 升序
    const aDue = new Date(a.due_date).getTime();
    const bDue = new Date(b.due_date).getTime();
    return aDue - bDue;
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800">Bills</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track shared expenses with friends</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              {(["all","inviter","invited","history"] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterType === key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {key === 'all' && 'All'}
                  {key === 'inviter' && 'Created'}
                  {key === 'invited' && 'Invited'}
                  {key === 'history' && 'History'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold shadow-sm hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            >
              <span className="text-lg leading-none">＋</span> Create Bill
            </button>
          </div>
        </div>

        {/* Bills List */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sortedBills.length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3 border-dashed border-2">
              <CardContent className="py-14 flex flex-col items-center justify-center text-center">
                <div className="mb-3 text-5xl">📋</div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No bills found</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {filterType === 'inviter' && 'You have not created any active bills yet.'}
                  {filterType === 'invited' && 'You have no active bills you were invited to.'}
                  {filterType === 'history' && 'No completed bills yet.'}
                  {filterType === 'all' && 'Create a bill to get started.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedBills.map((bill) => {
              const paidCount = getPaidCount(bill);
              const totalPeople = getTotalPeople(bill);
              const isFullyPaid = bill.status === 'paid' || paidCount === totalPeople;
              const userPaid = hasUserPaid(bill);
              // Overdue = past due date and not fully paid
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dueDateObj = new Date(bill.due_date);
              dueDateObj.setHours(0, 0, 0, 0);
              const isOverdue = dueDateObj < today && !isFullyPaid;
              return (
                <Card
                  key={bill.id}
                  className={`group relative overflow-hidden border shadow-sm hover:shadow-md transition cursor-pointer ${isOverdue ? 'border-red-500 ring-2 ring-red-300' : ''}`}
                  onClick={() => handleDetailsClick(bill)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="text-base font-semibold text-gray-800 line-clamp-1">{bill.title}</span>
                      <span className="flex gap-1">
                        {bill.category && (
                          <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-medium capitalize border border-indigo-100">{bill.category}</span>
                        )}
                        {isOverdue && (
                          <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold border border-red-200">Overdue</span>
                        )}
                        {isFullyPaid && (
                          <span className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-semibold border border-green-200">Paid</span>
                        )}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end justify-between">
                      <div className="space-y-1">
                        <p className="text-2xl font-bold tracking-tight text-indigo-600">£{Number(bill.amount).toFixed(2)}</p>
                        {bill.description && <p className="text-xs text-gray-500 line-clamp-1">{bill.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Due</p>
                        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                          {new Date(bill.due_date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {bill.bill_participants?.slice(0,5).map(participant => (
                          <div
                            key={participant.id}
                            className={`relative w-9 h-9 rounded-full ring-2 ring-white overflow-hidden bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-white ${participant.has_paid ? 'bg-green-500' : 'bg-gray-400'} shadow-sm`}
                            title={`${getUserDisplayName(participant.profile)}${participant.has_paid ? ' (paid)' : ''}`}
                          >
                            {participant.profile.avatar_url ? (
                              <Image
                                src={participant.profile.avatar_url}
                                alt={getUserDisplayName(participant.profile)}
                                fill
                                className={`object-cover ${participant.has_paid ? '' : 'opacity-60'}`}
                              />
                            ) : (
                              getInitials(participant.profile)
                            )}
                            {participant.has_paid && (
                              <span className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-600 text-white text-[10px] font-bold shadow">✓</span>
                            )}
                          </div>
                        ))}
                        {bill.bill_participants && bill.bill_participants.length > 5 && (
                          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 ring-2 ring-white text-xs font-medium text-gray-600">+{bill.bill_participants.length - 5}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {paidCount}/{totalPeople} paid
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      {isCreator(bill) ? (
                        !isFullyPaid ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInviteClick(e,bill); }}
                            className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
                          >Invite</button>
                        ) : (
                          <span className="text-xs font-medium text-green-600">All paid</span>
                        )
                      ) : userPaid ? (
                        isFullyPaid ? (
                          <span className="text-xs font-medium text-green-600">All paid</span>
                        ) : (
                          <span className="text-xs text-gray-600">Waiting others</span>
                        )
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePayClick(e,bill); }}
                          className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                        >Pay</button>
                      )}
                      <span className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition">Details →</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {selectedBill?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
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
              <DialogTitle className="text-xl font-semibold">Create New Bill</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
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
              <DialogTitle className="text-xl font-semibold">Invite Payers - {invitingBill?.title}</DialogTitle>
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
              <div className="flex gap-3 pt-2">
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

        {/* Bank Card Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">💳 Pay with Bank Card</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Bill Information */}
              {payingBill && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Bill Details</h4>
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Bill:</span> {payingBill.title}
                  </p>
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Amount to Pay:</span>{" "}
                    <span className="text-lg font-bold">
                      £{payingBill.bill_participants
                        ?.find(p => p.user_id === currentUserId)
                        ?.amount_owed.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              {/* Card Details Form */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Card Details</h4>
                
                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    value={cardDetails.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      // Auto-format with spaces: XXXX XXXX XXXX XXXX
                      let formatted = '';
                      for (let i = 0; i < value.length && i < 16; i++) {
                        if (i > 0 && i % 4 === 0) formatted += ' ';
                        formatted += value[i];
                      }
                      setCardDetails({ ...cardDetails, accountNumber: value });
                      setCardValidation(null);
                    }}
                    placeholder="16-digit card number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    maxLength={19}
                    disabled={isProcessingPayment}
                  />
                </div>

                {/* Card Holder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Holder Name *
                  </label>
                  <input
                    type="text"
                    value={cardDetails.cardHolderName}
                    onChange={(e) => {
                      setCardDetails({ ...cardDetails, cardHolderName: e.target.value });
                      setCardValidation(null);
                    }}
                    placeholder="Full name as on card"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessingPayment}
                  />
                </div>

                {/* CVV and Expiry Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV *
                    </label>
                    <input
                      type="text"
                      value={cardDetails.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 3) {
                          setCardDetails({ ...cardDetails, cvv: value });
                          setCardValidation(null);
                        }
                      }}
                      placeholder="3 digits"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={3}
                      disabled={isProcessingPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date *
                    </label>
                    <input
                      type="text"
                      value={cardDetails.expiryDate}
                      onChange={(e) => {
                        let value = e.target.value.replace(/[^\d/]/g, '');
                        // Auto-format to MM/YY
                        if (value.length === 2 && !value.includes('/')) {
                          value += '/';
                        }
                        if (value.length <= 5) {
                          setCardDetails({ ...cardDetails, expiryDate: value });
                          setCardValidation(null);
                        }
                      }}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={5}
                      disabled={isProcessingPayment}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  💡 Test card: Card Number: 4532015112830366, Name: James Wilson, CVV: 366, Expiry: 12/28
                </p>
              </div>

              {/* Validate Button */}
              {!cardValidation && (
                <button
                  onClick={handleValidateCard}
                  disabled={
                    !cardDetails.accountNumber || 
                    !cardDetails.cardHolderName || !cardDetails.cvv || 
                    !cardDetails.expiryDate || isValidating
                  }
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isValidating ? "Validating..." : "Validate Card"}
                </button>
              )}

              {/* Card Validation Result */}
              {cardValidation && (
                <div className={`p-4 rounded-lg border ${
                  cardValidation.valid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {cardValidation.valid ? '✅' : '❌'}
                    </span>
                    <div className="flex-1">
                      <p className={`font-medium ${
                        cardValidation.valid ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {cardValidation.message}
                      </p>
                      
                      {cardValidation.valid && (
                        <div className="mt-3 space-y-1 text-sm text-green-800">
                          <p>
                            <span className="font-medium">Card Number:</span>{" "}
                            {cardValidation.maskedCardNumber}
                          </p>
                          <p>
                            <span className="font-medium">Cardholder:</span>{" "}
                            {cardValidation.cardHolderName}
                          </p>
                          <p>
                            <span className="font-medium">Bank:</span>{" "}
                            {cardValidation.bankName}
                          </p>
                          <p>
                            <span className="font-medium">Available Balance:</span>{" "}
                            <span className="text-lg font-bold">
                              £{cardValidation.balance?.toFixed(2)}
                            </span>
                          </p>
                        </div>
                      )}
                      
                      {!cardValidation.valid && (
                        <button
                          onClick={() => {
                            setCardDetails({
                              accountNumber: "",
                              cardHolderName: "",
                              cvv: "",
                              expiryDate: ""
                            });
                            setCardValidation(null);
                          }}
                          className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
                        >
                          Try again →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setCardDetails({
                      accountNumber: "",
                      cardHolderName: "",
                      cvv: "",
                      expiryDate: ""
                    });
                    setCardValidation(null);
                  }}
                  disabled={isProcessingPayment}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPayment}
                  disabled={!cardValidation?.valid || isProcessingPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isProcessingPayment ? "Processing..." : "Confirm Payment"}
                </button>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">🔒</span>
                <p className="text-xs text-gray-600">
                  Your payment is processed securely. Card information is validated
                  and balance is checked before processing.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}