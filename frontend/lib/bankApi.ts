/**
 * Bank Card API Client
 * Handles bank card validation and payment processing
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface CardValidationRequest {
  account_number: string; // 16-digit card number
  card_holder_name: string;
  cvv: string;
  expiry_date: string; // MM/YY
}

export interface CardValidationResponse {
  valid: boolean;
  card_holder_name?: string;
  bank_name?: string;
  balance?: number;
  masked_card_number?: string;
  message?: string;
}

export interface PaymentRequest {
  account_number: string; // 16-digit card number
  card_holder_name: string;
  cvv: string;
  expiry_date: string; // MM/YY
  amount: number;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  new_balance?: number;
  transaction_id?: string;
}

/**
 * Validate a bank card with full details
 */
export async function validateBankCard(cardDetails: CardValidationRequest): Promise<CardValidationResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bank/validate-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardDetails),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating card:', error);
    throw error;
  }
}

/**
 * Process a payment with full card details
 */
export async function processBankPayment(
  paymentRequest: PaymentRequest
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bank/process-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}
