"""UK Bank Card Database System.

Simple banking system to store UK payment card information.
Uses a separate Supabase instance for bank data.
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client

# Load environment variables
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

load_dotenv(str(ROOT / ".env"))
load_dotenv(str(HERE / ".env"))

# Bank Supabase configuration (separate from main app)
BANK_SUPABASE_URL = os.getenv("BANK_SUPABASE_URL")
BANK_SUPABASE_KEY = os.getenv("BANK_SUPABASE_KEY")

if not BANK_SUPABASE_URL or not BANK_SUPABASE_KEY:
    _MISSING_ENV = True
else:
    _MISSING_ENV = False

_bank_client: Optional[Client] = None

def get_bank_client() -> Client:
    """Get or create Supabase client for bank database."""
    global _bank_client
    if _bank_client is None:
        if _MISSING_ENV:
            raise RuntimeError(
                "Missing Bank Supabase configuration: set BANK_SUPABASE_URL and BANK_SUPABASE_KEY in .env"
            )
        _bank_client = create_client(BANK_SUPABASE_URL, BANK_SUPABASE_KEY)
    return _bank_client


# Table name
T_BANK_CARDS = "bank_cards"


def create_bank_card(
    card_number: str,
    card_holder_name: str,
    sort_code: str,
    account_number: str,
    balance: float = 1000.00,
    bank_name: str = "UK Bank",
    card_type: str = "Debit"
) -> Dict[str, Any]:
    """Create a new bank card record.
    
    Args:
        card_number: 16-digit card number
        card_holder_name: Name on the card
        sort_code: UK sort code (e.g., "12-34-56")
        account_number: 8-digit account number
        balance: Initial balance in GBP (default £1000)
        bank_name: Name of the bank
        card_type: Type of card (Debit/Credit)
    
    Returns:
        Created bank card record
    """
    sb = get_bank_client()
    now = datetime.utcnow().isoformat()
    
    payload = {
        "card_number": card_number,
        "card_holder_name": card_holder_name,
        "sort_code": sort_code,
        "account_number": account_number,
        "balance": float(balance),
        "currency": "GBP",
        "bank_name": bank_name,
        "card_type": card_type,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    
    res = sb.table(T_BANK_CARDS).insert(payload).execute()
    return res.data[0] if res.data else {}


def get_bank_card(card_id: str) -> Optional[Dict[str, Any]]:
    """Get a bank card by ID."""
    sb = get_bank_client()
    res = sb.table(T_BANK_CARDS).select("*").eq("id", card_id).execute()
    return res.data[0] if res.data else None


def get_bank_card_by_number(card_number: str) -> Optional[Dict[str, Any]]:
    """Get a bank card by card number."""
    sb = get_bank_client()
    res = sb.table(T_BANK_CARDS).select("*").eq("card_number", card_number).execute()
    return res.data[0] if res.data else None


def list_bank_cards() -> List[Dict[str, Any]]:
    """List all bank cards."""
    sb = get_bank_client()
    res = sb.table(T_BANK_CARDS).select("*").order("created_at").execute()
    return res.data or []


def update_balance(card_number: str, new_balance: float) -> Dict[str, Any]:
    """Update the balance of a bank card."""
    sb = get_bank_client()
    now = datetime.utcnow().isoformat()
    
    res = sb.table(T_BANK_CARDS).update({
        "balance": float(new_balance),
        "updated_at": now,
    }).eq("card_number", card_number).execute()
    
    return res.data[0] if res.data else {}


def deduct_balance(card_number: str, amount: float) -> Dict[str, Any]:
    """Deduct an amount from a bank card balance.
    
    Args:
        card_number: Card number to deduct from
        amount: Amount to deduct
    
    Returns:
        Updated bank card record
    
    Raises:
        ValueError: If insufficient balance
    """
    card = get_bank_card_by_number(card_number)
    if not card:
        raise ValueError(f"Card {card_number} not found")
    
    current_balance = float(card.get("balance", 0))
    if current_balance < amount:
        raise ValueError(
            f"Insufficient balance. Current: £{current_balance:.2f}, Required: £{amount:.2f}"
        )
    
    new_balance = current_balance - amount
    return update_balance(card_number, new_balance)


def add_balance(card_number: str, amount: float) -> Dict[str, Any]:
    """Add an amount to a bank card balance."""
    card = get_bank_card_by_number(card_number)
    if not card:
        raise ValueError(f"Card {card_number} not found")
    
    current_balance = float(card.get("balance", 0))
    new_balance = current_balance + amount
    return update_balance(card_number, new_balance)


def get_balance(card_number: str) -> float:
    """Get the current balance of a bank card."""
    card = get_bank_card_by_number(card_number)
    if not card:
        raise ValueError(f"Card {card_number} not found")
    return float(card.get("balance", 0))


def delete_all_cards() -> Dict[str, Any]:
    """Delete all bank cards (for testing/reset purposes)."""
    sb = get_bank_client()
    try:
        # Delete all records
        res = sb.table(T_BANK_CARDS).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        return {"status": "ok", "deleted": len(res.data) if res.data else 0}
    except Exception as e:
        return {"status": "error", "message": str(e)}
