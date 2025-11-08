/**
 * Reward System API Client
 * 
 * Provides typed functions to interact with the backend reward API.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface User {
  UserID: string;
  UserName: string;
  Email: string;
  CurrentCredit: number;
  JoinedAt: string;
}

export interface Bill {
  BillID: string;
  UserID: string;
  Title: string;
  Description?: string;
  ReceiverBank?: string;
  ReceiverName?: string;
  Amount: number;
  DueDate: string;
  Status: string;
  PaymentStatus: string;
  Category: string;
  RewardRate: number;
  RewardEarned: number;
  CreatedAt: string;
}

export interface Payment {
  PaymentID: string;
  BillID: string;
  UserID: string;
  PayerBank?: string;
  PayerName?: string;
  PaymentTime: string;
  OrderNumber?: string;
  AmountPaid: number;
  PaymentMethod: string;
  PaymentStatus: string;
  CreditAwarded: number;
  TransactionType: string;
  Remark?: string;
}

export interface Reward {
  RewardID: string;
  Type: string;
  CreditCost: number;
  Description?: string;
  Icon?: string;
  Active: boolean;
}

export interface Redemption {
  RedemptionID: string;
  UserID: string;
  RewardID: string;
  CreditSpent: number;
  RedemptionDate: string;
  RewardStatus: string;
}

export interface CreditLog {
  LogID: string;
  UserID: string;
  SourceType: string;
  SourceID?: string;
  ChangeAmount: number;
  BalanceAfter: number;
  Timestamp: string;
}

export interface Leaderboard {
  UserID: string;
  TotalCreditEarned: number;
  TotalRedeemed: number;
  LastUpdated: string;
}

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text || `Request failed: ${response.status}`);
  }
  return response.json();
}

// User APIs
export async function initUser(userId: string, email: string, username?: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reward/users/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ UserID: userId, Email: email, UserName: username }),
    });
    return handleResponse<User>(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(0, `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

export async function ensureUser(userId: string, email: string, username?: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/reward/users/ensure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserID: userId, Email: email, UserName: username }),
  });
  return handleResponse<User>(response);
}

export async function getUser(userId: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/reward/users/${userId}`);
  return handleResponse<User>(response);
}

export async function listUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE_URL}/api/reward/users`);
  return handleResponse<User[]>(response);
}

// Bill APIs
export async function listBills(userId?: string): Promise<Bill[]> {
  const url = userId 
    ? `${API_BASE_URL}/api/reward/bills?user_id=${userId}`
    : `${API_BASE_URL}/api/reward/bills`;
  const response = await fetch(url);
  return handleResponse<Bill[]>(response);
}

export async function getBill(billId: string): Promise<Bill> {
  const response = await fetch(`${API_BASE_URL}/api/reward/bills/${billId}`);
  return handleResponse<Bill>(response);
}

export async function createBill(bill: {
  UserID: string;
  Title: string;
  Amount: number;
  DueDate: string;
  Category: string;
  Description?: string;
  ReceiverBank?: string;
  ReceiverName?: string;
}): Promise<Bill> {
  const response = await fetch(`${API_BASE_URL}/api/reward/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  });
  return handleResponse<Bill>(response);
}

// Payment APIs
export async function createPayment(payment: {
  BillID: string;
  AmountPaid: number;
  PaymentMethod: string;
  PayerName?: string;
  PayerBank?: string;
  OrderNumber?: string;
  Remark?: string;
}): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/api/reward/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  return handleResponse<Payment>(response);
}

export async function listPayments(userId?: string, billId?: string): Promise<Payment[]> {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  if (billId) params.append('bill_id', billId);
  const url = `${API_BASE_URL}/api/reward/payments${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  return handleResponse<Payment[]>(response);
}

export async function getPayment(paymentId: string): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/api/reward/payments/${paymentId}`);
  return handleResponse<Payment>(response);
}

// Reward APIs
export async function listRewards(active?: boolean): Promise<Reward[]> {
  try {
    const url = active !== undefined
      ? `${API_BASE_URL}/api/reward/rewards?active=${active}`
      : `${API_BASE_URL}/api/reward/rewards`;
    const response = await fetch(url);
    return handleResponse<Reward[]>(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(0, `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

export async function getReward(rewardId: string): Promise<Reward> {
  const response = await fetch(`${API_BASE_URL}/api/reward/rewards/${rewardId}`);
  return handleResponse<Reward>(response);
}

export async function createReward(reward: {
  Type: string;
  CreditCost: number;
  Description?: string;
  Icon?: string;
}): Promise<Reward> {
  const response = await fetch(`${API_BASE_URL}/api/reward/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reward),
  });
  return handleResponse<Reward>(response);
}

// Redemption APIs
export async function redeemReward(userId: string, rewardId: string): Promise<Redemption> {
  const response = await fetch(`${API_BASE_URL}/api/reward/redemptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserID: userId, RewardID: rewardId }),
  });
  return handleResponse<Redemption>(response);
}

export async function listRedemptions(userId: string): Promise<Redemption[]> {
  const response = await fetch(`${API_BASE_URL}/api/reward/redemptions/${userId}`);
  return handleResponse<Redemption[]>(response);
}

// Credit Log APIs
export async function getCreditLogs(userId: string): Promise<CreditLog[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reward/credit_logs/${userId}`);
    return handleResponse<CreditLog[]>(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(0, `Cannot connect to backend at ${API_BASE_URL}. Is the server running?`);
    }
    throw error;
  }
}

// Leaderboard APIs
export async function getLeaderboard(limit: number = 10): Promise<Leaderboard[]> {
  const response = await fetch(`${API_BASE_URL}/api/reward/leaderboard?limit=${limit}`);
  return handleResponse<Leaderboard[]>(response);
}
