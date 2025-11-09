GUHack2025 Backend
===================

This folder contains the FastAPI backend for GUHack2025, including:
- **Reward System**: User rewards, bills, payments, and credit management
- **Bank Card System**: UK payment card management (separate Supabase instance)

## Project Structure

- `main.py` - FastAPI application entrypoint
- `db.py` - Supabase client and reward system DB helpers
- `bank_db.py` - UK Bank Card database operations
- `reward.py` - Reward system API routes
- `routers/` - API routers (one file per feature)
- `services/` - Business logic wrappers
- `models/` - Pydantic models (optional split)
- `utils/` - Small helpers (logger, date utils)

## Quick Start (Development)

### 1. Install Dependencies

Create a virtual environment and install packages:

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Windows CMD)
.\venv\Scripts\activate.bat

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy the example env file and configure:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
# Main Reward System
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Bank Card System (can use same or different Supabase project)
BANK_SUPABASE_URL=https://your-bank-project.supabase.co
BANK_SUPABASE_KEY=your-bank-service-role-key
```

### 3. Set Up Bank Card Database

See [BANK_SYSTEM.md](./BANK_SYSTEM.md) for detailed setup instructions.

Quick setup:

```bash
# 1. Run bank_schema.sql in Supabase SQL Editor
# 2. Initialize 10 UK bank cards with £1000 each
python init_bank_cards.py
```

### 4. Run the Application

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

API will be available at: http://localhost:8001

## Bank Card System

### Features

- Store UK payment card information (card number, sort code, account number)
- Manage account balances in GBP (£)
- Support balance queries, deposits, and withdrawals
- 10 pre-configured UK bank cards with £1000 each

### Quick Commands

```bash
# Initialize bank cards (first time)
python init_bank_cards.py

# Reset and recreate all cards
python init_bank_cards.py --reset

# Test the bank system
python test_bank_system.py
```

### Python API Example

```python
from bank_db import get_bank_card_by_number, deduct_balance

# Get card info
card = get_bank_card_by_number("4532015112830366")
print(f"Balance: £{card['balance']}")

# Process payment
updated_card = deduct_balance("4532015112830366", 50.00)
print(f"New balance: £{updated_card['balance']}")
```

### Pre-configured Cards

10 UK bank cards from major banks:
- Barclays, HSBC, Lloyds Bank, NatWest, Santander UK
- Royal Bank of Scotland, Metro Bank, Nationwide, TSB Bank, Monzo
- Each card starts with £1,000.00

See [BANK_SYSTEM.md](./BANK_SYSTEM.md) for complete documentation.

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Testing

```bash
# Test database connection
python test_db_connection.py

# Test bank card system
python test_bank_system.py
```

## Notes

- Bank card system uses a separate Supabase instance for data isolation
- All amounts in the bank system are in GBP (£)
- Service Role Keys required for full database access
- See `.env.example` for all configuration options
