"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Hard-coded mock data
const CURRENT_USER_ID = 1;

const availableUsers = [
  { id: 1, name: "Alice", avatar: "A" },
  { id: 2, name: "Bob", avatar: "B" },
  { id: 3, name: "Charlie", avatar: "C" },
  { id: 4, name: "David", avatar: "D" },
  { id: 5, name: "Emma", avatar: "E" },
  { id: 6, name: "Frank", avatar: "F" },
];

const mockBills = [
  {
    id: 1,
    name: "Electricity Bill",
    amount: 125.50,
    dueDate: "2025-11-15",
    totalPeople: 4,
    paidCount: 2,
    participants: [
      { id: 1, name: "Alice", avatar: "A", paid: true },
      { id: 2, name: "Bob", avatar: "B", paid: true },
      { id: 3, name: "Charlie", avatar: "C", paid: false },
      { id: 4, name: "David", avatar: "D", paid: false },
    ],
  },
  {
    id: 2,
    name: "Internet Bill",
    amount: 45.00,
    dueDate: "2025-11-20",
    totalPeople: 4,
    paidCount: 3,
    participants: [
      { id: 1, name: "Alice", avatar: "A", paid: false },
      { id: 2, name: "Bob", avatar: "B", paid: true },
      { id: 3, name: "Charlie", avatar: "C", paid: true },
      { id: 4, name: "David", avatar: "D", paid: true },
    ],
  },
  {
    id: 3,
    name: "Water Bill",
    amount: 35.75,
    dueDate: "2025-11-25",
    totalPeople: 4,
    paidCount: 1,
    participants: [
      { id: 1, name: "Alice", avatar: "A", paid: false },
      { id: 2, name: "Bob", avatar: "B", paid: true },
      { id: 3, name: "Charlie", avatar: "C", paid: false },
      { id: 4, name: "David", avatar: "D", paid: false },
    ],
  },
  {
    id: 4,
    name: "Rent",
    amount: 1200.00,
    dueDate: "2025-12-01",
    totalPeople: 4,
    paidCount: 4,
    createdBy: 1, // Alice created this
    participants: [
      { id: 1, name: "Alice", avatar: "A", paid: true, amount: 300 },
      { id: 2, name: "Bob", avatar: "B", paid: true, amount: 300 },
      { id: 3, name: "Charlie", avatar: "C", paid: true, amount: 300 },
      { id: 4, name: "David", avatar: "D", paid: true, amount: 300 },
    ],
  },
].map(bill => ({ ...bill, createdBy: bill.createdBy || 2 }));

export default function BillsPage() {
  const [bills, setBills] = useState(mockBills);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [invitingBill, setInvitingBill] = useState<any>(null);
  const [filterType, setFilterType] = useState<"all" | "inviter" | "invited" | "history">("all");
  
  // Create Bill Form State
  const [newBill, setNewBill] = useState({
    name: "",
    totalAmount: "",
    dueDate: "",
    paymentType: "domestic", // domestic or international
    accountNumber: "",
    sortCode: "",
    iban: "",
    swift: "",
    recipientName: "",
  });
  
  // Split participants with custom amounts
  const [splitParticipants, setSplitParticipants] = useState<Array<{
    userId: number;
    name: string;
    avatar: string;
    amount: string;
  }>>([]);

  const hasUserPaid = (bill: any) => {
    const currentUser = bill.participants.find((p: any) => p.id === CURRENT_USER_ID);
    return currentUser?.paid || false;
  };

  const handlePayClick = (e: React.MouseEvent, billId: number) => {
    e.stopPropagation();

    setBills(prevBills => prevBills.map(bill => {
      if (bill.id === billId) {
        const updatedParticipants = bill.participants.map((p: any) => 
          p.id === CURRENT_USER_ID ? { ...p, paid: true } : p
        );

        const newPaidCount = updatedParticipants.filter((p: any) => p.paid).length;
        
        return {
          ...bill,
          participants: updatedParticipants,
          paidCount: newPaidCount
        };
      }
      return bill;
    }));

    alert(`✅ Payment successful! You paid £${bills.find(b => b.id === billId)?.amount.toFixed(2)}`);
  };

  const handleDetailsClick = (bill: any) => {
    setSelectedBill(bill);
    setIsDialogOpen(true);
  };

  const handleAddParticipant = (user: any) => {
    if (!splitParticipants.find(p => p.userId === user.id)) {
      const currentTotal = parseFloat(newBill.totalAmount) || 0;
      const newParticipantCount = splitParticipants.length + 1;
      const averageAmount = currentTotal > 0 ? (currentTotal / newParticipantCount).toFixed(2) : "";
      
      setSplitParticipants([...splitParticipants, {
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        amount: averageAmount
      }]);
    }
  };

  const handleRemoveParticipant = (userId: number) => {
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

  const handleUpdateAmount = (userId: number, amount: string) => {
    setSplitParticipants(splitParticipants.map(p => 
      p.userId === userId ? { ...p, amount } : p
    ));
  };

  const handleCreateBill = () => {
    if (!newBill.name || !newBill.totalAmount || !newBill.dueDate) {
      alert("⚠️ Please fill in all required fields (Name, Amount, Due Date)");
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

    const totalAssigned = splitParticipants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    
    if (Math.abs(totalAssigned - billTotal) > 0.01) {
      alert(`⚠️ Total assigned (£${totalAssigned.toFixed(2)}) must equal bill amount (£${billTotal.toFixed(2)})`);
      return;
    }

    const hasEmptyAmount = splitParticipants.some(p => !p.amount || parseFloat(p.amount) <= 0);
    if (hasEmptyAmount) {
      alert("⚠️ All participants must have a valid amount greater than 0");
      return;
    }

    if (newBill.paymentType === "domestic") {
      if (!newBill.accountNumber || !newBill.sortCode) {
        alert("⚠️ Please enter account number and sort code for UK payment");
        return;
      }
    } else {
      if (!newBill.iban || !newBill.swift) {
        alert("⚠️ Please enter IBAN and SWIFT/BIC for international payment");
        return;
      }
    }

    const createdBill = {
      id: Math.max(...bills.map(b => b.id), 0) + 1,
      name: newBill.name,
      amount: billTotal,
      dueDate: newBill.dueDate,
      totalPeople: splitParticipants.length,
      paidCount: 0,
      createdBy: CURRENT_USER_ID,
      participants: splitParticipants.map(p => ({
        id: p.userId,
        name: p.name,
        avatar: p.avatar,
        paid: false,
        amount: parseFloat(p.amount)
      })),
      paymentInfo: {
        type: newBill.paymentType,
        accountNumber: newBill.accountNumber,
        sortCode: newBill.sortCode,
        iban: newBill.iban,
        swift: newBill.swift,
        recipientName: newBill.recipientName,
      }
    };

    setBills([createdBill, ...bills]);
  
    setNewBill({
      name: "",
      totalAmount: "",
      dueDate: "",
      paymentType: "domestic",
      accountNumber: "",
      sortCode: "",
      iban: "",
      swift: "",
      recipientName: "",
    });
    setSplitParticipants([]);
    setSplitParticipants([]);
    setIsCreateDialogOpen(false);
    
    alert(`✅ Bill "${newBill.name}" created successfully!\n${splitParticipants.length} participants added.`);
  };

  // Selecting bills
  const filteredBills = bills.filter(bill => {
    if (filterType === "inviter") {
      return bill.createdBy === CURRENT_USER_ID && bill.paidCount < bill.totalPeople;
    } else if (filterType === "invited") {
      return bill.createdBy !== CURRENT_USER_ID && bill.paidCount < bill.totalPeople;
    } else if (filterType === "history") {
      return bill.paidCount === bill.totalPeople;
    }
    return true; // all
  });

  const isCreator = (bill: any) => bill.createdBy === CURRENT_USER_ID;

  const handleInviteClick = (e: React.MouseEvent, bill: any) => {
    e.stopPropagation();
    setInvitingBill(bill);
    setIsInviteDialogOpen(true);
  };

  const handleSendInvitation = (participantIds: number[]) => {
    if (participantIds.length === 0) {
      alert("Please select at least one participant to invite");
      return;
    }

    const participantNames = invitingBill.participants
      .filter((p: any) => participantIds.includes(p.id) && !p.paid)
      .map((p: any) => p.name)
      .join(", ");
    
    alert(`✅ Invitation sent to: ${participantNames}`);
    setIsInviteDialogOpen(false);
  };

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
            filteredBills.map((bill) => (
            <Card
              key={bill.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleDetailsClick(bill)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between">
                  {/* Left Side */}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold text-gray-800">
                      {bill.name}
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      £{bill.amount.toFixed(2)}
                    </p>

                    {/* Distinguish the role of user */}
                    {isCreator(bill) ? (
                      bill.paidCount < bill.totalPeople ? (
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
                        <p className="text-sm text-gray-600">
                          {bill.paidCount} / {bill.totalPeople} people paid
                        </p>
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
                        {new Date(bill.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Avatar List */}
                    <div className="flex -space-x-2">
                      {bill.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold border-2 border-white ${
                            participant.paid
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                          title={participant.name}
                        >
                          {participant.avatar}
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
          )))}
        </div>

        {/* Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedBill?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    £{selectedBill?.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="text-lg font-medium">
                    {selectedBill &&
                      new Date(selectedBill.dueDate).toLocaleDateString(
                        "en-GB"
                      )}
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Payment Status ({selectedBill?.paidCount} /{" "}
                  {selectedBill?.totalPeople})
                </h4>

                {/* Paid People */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-green-600 mb-2">
                    ✓ Paid
                  </p>
                  <div className="space-y-2">
                    {selectedBill?.participants
                      .filter((p: any) => p.paid)
                      .map((participant: any) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                            {participant.avatar}
                          </div>
                          <span className="font-medium text-gray-800">
                            {participant.name}
                          </span>
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
                    {selectedBill?.participants
                      .filter((p: any) => !p.paid)
                      .map((participant: any) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                            {participant.avatar}
                          </div>
                          <span className="font-medium text-gray-800">
                            {participant.name}
                          </span>
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
                      onChange={(e) => setNewBill({ ...newBill, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Payment Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type
                  </label>
                  <select
                    value={newBill.paymentType}
                    onChange={(e) => setNewBill({ ...newBill, paymentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="domestic">UK Domestic Payment</option>
                    <option value="international">International Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={newBill.recipientName}
                    onChange={(e) => setNewBill({ ...newBill, recipientName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Recipient name"
                  />
                </div>

                {newBill.paymentType === "domestic" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={newBill.accountNumber}
                        onChange={(e) => setNewBill({ ...newBill, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12345678"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sort Code
                      </label>
                      <input
                        type="text"
                        value={newBill.sortCode}
                        onChange={(e) => setNewBill({ ...newBill, sortCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12-34-56"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={newBill.iban}
                        onChange={(e) => setNewBill({ ...newBill, iban: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="GB29 NWBK 6016 1331 9268 19"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SWIFT/BIC
                      </label>
                      <input
                        type="text"
                        value={newBill.swift}
                        onChange={(e) => setNewBill({ ...newBill, swift: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="NWBKGB2L"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Split Bill - Add Participants */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Split Bill - Add Participants</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select People to Split With
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableUsers
                      .filter(u => u.id !== CURRENT_USER_ID)
                      .map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleAddParticipant(user)}
                          disabled={splitParticipants.some(p => p.userId === user.id)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            splitParticipants.some(p => p.userId === user.id)
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          }`}
                        >
                          {user.avatar} {user.name}
                        </button>
                      ))}
                  </div>
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
                    <p className="text-sm text-gray-600">
                      Total assigned: £
                      {splitParticipants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                      {newBill.totalAmount && (
                        <span className="ml-2">
                          / £{parseFloat(newBill.totalAmount).toFixed(2)}
                        </span>
                      )}
                    </p>
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
                Invite Payers - {invitingBill?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Select participants to send payment reminders:
                </p>

                {/* List of unpaid participants */}
                <div className="space-y-2">
                  {invitingBill?.participants
                    .filter((p: any) => !p.paid)
                    .map((participant: any) => (
                      <label
                        key={participant.id}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          data-participant-id={participant.id}
                        />
                        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                          {participant.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{participant.name}</p>
                          <p className="text-sm text-gray-500">
                            Amount: £{participant.amount?.toFixed(2) || (invitingBill.amount / invitingBill.totalPeople).toFixed(2)}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>

                {invitingBill?.participants.filter((p: any) => !p.paid).length === 0 && (
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
                      .map((cb: any) => parseInt(cb.dataset.participantId));
                    handleSendInvitation(selectedIds);
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  disabled={invitingBill?.participants.filter((p: any) => !p.paid).length === 0}
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
