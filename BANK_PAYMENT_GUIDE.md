# Bank Payment System Guide

## Overview

This system provides a UK bank card payment integration for bill payments. It mimics the **standard UK online shopping payment experience**, where customers pay using their **16-digit card number**, **cardholder name**, **CVV**, and **expiry date**.

## Payment Flow (UK Online Shopping Style)

### 1. **Card Information Required**
When making a payment, users need to provide:
- **Card Number**: 16-digit card number (e.g., 4532 3662 7845 9558)
- **Cardholder Name**: Full name as it appears on the card
- **CVV**: 3-digit security code on the back of the card
- **Expiry Date**: Card expiration in MM/YY format

> ⚠️ **Note**: This mimics UK online shopping checkout pages (e.g., Amazon, ASOS, Tesco). Sort codes and account numbers are NOT used for card payments in online shopping.

### 2. **Validation Process**
1. User enters card details in the payment dialog
2. System validates:
   - Card number format (16 digits)
   - CVV format (3 digits)
   - Expiry date format (MM/YY)
   - All fields are filled
3. Click "Validate Card" button
4. Backend validates:
   - Card exists in the system
   - Cardholder name matches
   - CVV is correct
   - Card has not expired
   - Card is active

### 3. **Payment Processing**
1. After successful validation, card details and available balance are displayed
2. User clicks "Confirm Payment"
3. System:
   - Checks sufficient balance
   - Deducts the amount from the card
   - Updates bill status to "paid"
   - Awards credits to the user

## Test Cards

We have 10 test UK bank cards pre-configured with £1000 each:

| Bank | Card Number | Cardholder | CVV | Expiry | Balance |
|------|-------------|------------|-----|--------|---------|
| Barclays | 4532015112830366 | James Wilson | 366 | 12/28 | £1000.00 |
| HSBC | 4539791001730106 | Emma Thompson | 106 | 12/28 | £1000.00 |
| Lloyds Bank | 4556474670906442 | Oliver Brown | 442 | 12/28 | £1000.00 |
| Metro Bank | 4532261615476013 | George Martin | 013 | 12/28 | £1000.00 |
| Monzo | 4485382467536426 | Amelia Walker | 426 | 12/28 | £1000.00 |
| Nationwide | 4916338506082832 | Isabella Clark | 832 | 12/28 | £1000.00 |
| NatWest | 4929939187355598 | Sophie Taylor | 598 | 12/28 | £1000.00 |
| Royal Bank of Scotland | 4024007136512380 | Charlotte Evans | 380 | 12/28 | £1000.00 |
| Santander UK | 4485040371536584 | Harry Davies | 584 | 12/28 | £1000.00 |
| TSB Bank | 4539678673064322 | Jack Robinson | 322 | 12/28 | £1000.00 |

> 💡 **CVV Calculation Rule**: For all test cards, the CVV is the **last 3 digits** of the card number.
> For example: Card `4532015112830366` → CVV is `366`

### Quick Test Card
```
Card Number: 4532015112830366
Cardholder Name: James Wilson
CVV: 366
Expiry Date: 12/28
```

### All Test Cards (Copy-Paste Ready)

#### 1. Barclays - James Wilson
```
Card Number: 4532015112830366
Name: James Wilson
CVV: 366
Expiry: 12/28
```

#### 2. HSBC - Emma Thompson
```
Card Number: 4539791001730106
Name: Emma Thompson
CVV: 106
Expiry: 12/28
```

#### 3. Lloyds Bank - Oliver Brown
```
Card Number: 4556474670906442
Name: Oliver Brown
CVV: 442
Expiry: 12/28
```

#### 4. Metro Bank - George Martin
```
Card Number: 4532261615476013
Name: George Martin
CVV: 013
Expiry: 12/28
```

#### 5. Monzo - Amelia Walker
```
Card Number: 4485382467536426
Name: Amelia Walker
CVV: 426
Expiry: 12/28
```

#### 6. Nationwide - Isabella Clark
```
Card Number: 4916338506082832
Name: Isabella Clark
CVV: 832
Expiry: 12/28
```

#### 7. NatWest - Sophie Taylor
```
Card Number: 4929939187355598
Name: Sophie Taylor
CVV: 598
Expiry: 12/28
```

#### 8. Royal Bank of Scotland - Charlotte Evans
```
Card Number: 4024007136512380
Name: Charlotte Evans
CVV: 380
Expiry: 12/28
```

#### 9. Santander UK - Harry Davies
```
Card Number: 4485040371536584
Name: Harry Davies
CVV: 584
Expiry: 12/28
```

#### 10. TSB Bank - Jack Robinson
```
Card Number: 4539678673064322
Name: Jack Robinson
CVV: 322
Expiry: 12/28
```

## How It Works

### Backend (Python + FastAPI + Supabase)

#### 1. Database Structure
```sql
CREATE TABLE bank_cards (
  id UUID PRIMARY KEY,
  card_number TEXT UNIQUE NOT NULL,
  card_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  sort_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  cvv VARCHAR(3) NOT NULL,
  expiry_date VARCHAR(5) NOT NULL,
  balance DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT check_cvv_format CHECK (cvv ~ '^\d{3}$'),
  CONSTRAINT check_expiry_date_format CHECK (expiry_date ~ '^\d{2}/\d{2}$')
);

-- Indexes for fast validation queries
CREATE INDEX idx_bank_cards_expiry_date ON bank_cards(expiry_date);
CREATE INDEX idx_bank_cards_validation ON bank_cards(card_number, cvv, expiry_date);
CREATE INDEX idx_bank_cards_full_validation ON bank_cards(card_number, card_holder_name, cvv, expiry_date) WHERE status = 'active';
```

#### 2. API Endpoints

**POST `/api/bank/validate-card`**
- Validates card details for online shopping
- Request:
  ```json
  {
    "account_number": "4532015112830366",
    "card_holder_name": "James Wilson",
    "cvv": "366",
    "expiry_date": "12/28"
  }
  ```
- Response:
  ```json
  {
    "valid": true,
    "card_holder_name": "James Wilson",
    "bank_name": "Barclays",
    "balance": 1000.00,
    "masked_card_number": "****0366",
    "message": "Card validated successfully"
  }
  ```

**POST `/api/bank/process-payment`**
- Processes payment and deducts from card balance
- Request:
  ```json
  {
    "account_number": "4532015112830366",
    "card_holder_name": "James Wilson",
    "cvv": "366",
    "expiry_date": "12/28",
    "amount": 50.00
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "message": "Payment of £50.00 processed successfully",
    "new_balance": 950.00,
    "transaction_id": "..."
  }
  ```

#### 3. Security Features
- CVV validation (demo uses last 3 digits of card number)
- Expiry date checking (all test cards expire 12/28)
- Cardholder name verification (case-insensitive)
- Card status checking (must be "active")
- Balance verification before payment

### Frontend (Next.js + TypeScript)

#### Payment Dialog Features
1. **Card Input Form**
   - Card number input with auto-formatting (XXXX XXXX XXXX XXXX)
   - Cardholder name input
   - CVV input (3 digits, masked)
   - Expiry date input with auto-formatting (MM/YY)

2. **Real-time Validation**
   - Format validation as user types
   - Clear error messages
   - Test card hint displayed

3. **Visual Feedback**
   - Green success box when card is valid
   - Red error box when validation fails
   - Balance display after successful validation
   - Disabled state during processing

## Typical UK Online Shopping Payment Experience

This system replicates what UK users see when shopping online:

### Amazon / ASOS / Tesco Style Checkout
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Payment Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Card number *
┌────────────────────────────┐
│ 4532 3662 7845 9558        │
└────────────────────────────┘

Name on card *
┌────────────────────────────┐
│ James Wilson               │
└────────────────────────────┘

Expiry date *    Security code *
┌────────┐      ┌────────┐
│ 12/28  │      │ 558    │
└────────┘      └────────┘

[  Continue to payment  ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Why No Sort Code?

In the UK:
- **Sort Code + Account Number** = Used for **bank transfers** (like paying rent, sending money to friends)
- **Card Number + CVV + Expiry** = Used for **card payments** (like online shopping, paying bills with card)

Our system mimics **card payment** for online bill payment, so we only need card details, NOT sort code.

## Usage Example

### Paying a Bill

1. Navigate to Bills page
2. Find your bill and click "Pay"
3. Payment dialog opens
4. Enter card details:
   ```
   Card Number: 4532015112830366
   Name: James Wilson
   CVV: 366
   Expiry: 12/28
   ```
5. Click "Validate Card"
6. See validation result with balance
7. Click "Confirm Payment"
8. Payment processed, bill marked as paid, credits added

## Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- Supabase account (separate instance for bank data)

### Environment Variables

**Backend** (`.env`):
```env
BANK_SUPABASE_URL=your_bank_supabase_url
BANK_SUPABASE_KEY=your_bank_service_role_key
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running the System

1. **Start Backend**:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Initialize Test Cards** (first time only):
   ```bash
   cd backend
   python init_bank_cards.py
   ```

## API Testing

Test the validation endpoint:
```bash
curl -X POST http://localhost:8000/api/bank/validate-card \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "4532015112830366",
    "card_holder_name": "James Wilson",
    "cvv": "366",
    "expiry_date": "12/28"
  }'
```

## Troubleshooting

### Common Issues

1. **"Invalid card number"**
   - Check card number is exactly 16 digits
   - Use one of the test cards listed above

2. **"Card holder name does not match"**
   - Name is case-insensitive but must match exactly
   - Use "James Wilson" for test card

3. **"Invalid CVV"**
   - CVV is the last 3 digits of the card number
   - For 4532015112830366, CVV is 366

4. **"Insufficient balance"**
   - Each test card starts with £1000
   - Check `/api/bank/cards` endpoint to see current balances

## File Structure

```
backend/
  ├── bank_api.py          # API routes for card validation and payment
  ├── bank_db.py           # Database operations
  ├── init_bank_cards.py   # Initialize test cards
  ├── bank_schema.sql      # Database schema
  └── main.py              # FastAPI app (includes bank router)

frontend/
  ├── lib/
  │   └── bankApi.ts       # Bank API client
  └── app/
      └── bills/
          └── page.tsx     # Bills page with payment integration
```

## Security Considerations

⚠️ **For Production Use**:
- Store CVV hashed, never in plain text
- Implement proper PCI DSS compliance
- Use HTTPS for all API calls
- Add rate limiting to prevent brute force
- Implement 3D Secure (3DS) for authentication
- Use tokenization for card storage
- Add fraud detection
- Implement proper audit logging

This demo system is for **educational purposes** and uses simplified security for demonstration.
