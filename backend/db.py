"""Supabase database service for reward system.

Loads SUPABASE_URL and SUPABASE_KEY from environment (.env supported).
We try multiple .env locations to be robust regardless of working directory:
- backend/.env (next to this file)
- repo root .env (parent of backend)
Provides typed helpers that map DB rows <-> API shapes expected by reward.py.
"""
from __future__ import annotations

import os
from datetime import datetime, date
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client

# Load env once from multiple likely locations
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# Load root .env then backend/.env (later calls do not override existing by default)
load_dotenv(str(ROOT / ".env"))
load_dotenv(str(HERE / ".env"))

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("SUPABASE_PROJECT_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
)
SUPABASE_KEY = (
    os.getenv("SUPABASE_KEY")
    or os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

if not SUPABASE_URL or not SUPABASE_KEY:
    # Defer raising until first call to avoid import-time crashes during tooling
    _MISSING_ENV = True
else:
    _MISSING_ENV = False

_client: Optional[Client] = None

def get_client() -> Client:
    global _client
    if _client is None:
        if _MISSING_ENV:
            raise RuntimeError(
                "Missing Supabase configuration: set SUPABASE_URL and SUPABASE_KEY in environment or .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def get_env_status() -> Dict[str, Any]:
    """Diagnostics for environment configuration."""
    return {
        "SUPABASE_URL_present": bool(SUPABASE_URL),
        "SUPABASE_KEY_present": bool(SUPABASE_KEY),
        "loaded_root_env": (ROOT / ".env").exists(),
        "loaded_backend_env": (HERE / ".env").exists(),
    }

# Table names, mapped to actual Supabase schema
T_USER = "profiles"         # users/profile data (id uuid, full_name, email)
T_BILL = "bills"            # bills (id uuid)
T_PAYMENT = "payments"      # payments (id uuid)
T_CREDIT_LOG = "credit_log" # credit transaction log (user_id integer, change_amount integer)
T_CREDIT_SHOP = "credit_shop"# shop items (shop_item_id int, item_name, credit_cost)
T_REDEMPTION = "redemptions"# redemptions (id uuid, reward_id references rewards)
T_LEADERBOARD = "leaderboard"# leaderboard (user_id integer, total_credit_earned)
T_CREDITS = "rewards"       # ACTUAL TABLE NAME: "rewards" stores user credits (id uuid, user_id uuid, total_credits numeric)

# ---------- Helper functions ----------

def _safe_single(query_builder):
    """Safely execute a query that expects a single result.
    
    Returns None if no results found instead of raising an error.
    This is a workaround for Supabase Python client's .single() behavior.
    """
    try:
        result = query_builder.limit(1).execute()
        return result.data[0] if result.data else None
    except Exception:
        return None

# ---------- Mapping helpers (DB row -> API dict with aliased keys) ----------

def _user_to_api(row: Dict[str, Any], current_credit: Optional[int] = None) -> Dict[str, Any]:
    """Map profiles table row to API format.
    Schema: id (uuid), email (text), full_name (text), created_at (timestamptz)
    """
    return {
        "UserID": row.get("id"),
        "UserName": row.get("full_name"),
        "Email": row.get("email"),
        "PasswordHash": None,  # Not stored in profiles table
        "CurrentCredit": current_credit if current_credit is not None else 0,
        "JoinedAt": row.get("created_at"),
    }


def _bill_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map bills table row to API format.
    Schema: id, user_id, title, amount, due_date, status, created_at, 
            description, receiver_bank, receiver_name, category
    """
    amount = float(row.get("amount", 0) or 0)
    category = (row.get("category") or "rent").lower()
    rate_by_cat = {"rent": 5.0, "utility": 3.0, "subscription": 2.0}
    reward_rate = rate_by_cat.get(category, 5.0)
    reward_earned = int(amount * reward_rate / 100.0)
    status = row.get("status") or "unpaid"
    
    return {
        "BillID": row.get("id"),
        "UserID": row.get("user_id"),
        "Title": row.get("title"),
        "Description": row.get("description"),
        "ReceiverBank": row.get("receiver_bank"),
        "ReceiverName": row.get("receiver_name"),
        "Amount": amount,
        "DueDate": row.get("due_date"),
        "Status": status,
        "PaymentStatus": "Paid" if status == "paid" else "Pending",
        "Category": row.get("category") or "rent",
        "RewardRate": reward_rate,
        "RewardEarned": reward_earned,
        "CreatedAt": row.get("created_at"),
    }


def _payment_to_api(row: Dict[str, Any], credit_awarded: Optional[int] = None) -> Dict[str, Any]:
    """Map payments table row to API format.
    Schema: id, user_id, bill_id, amount_paid, status, created_at,
            payer_bank, payer_name, order_number, payment_method, payment_time, remark
    """
    return {
        "PaymentID": row.get("id"),
        "BillID": row.get("bill_id"),
        "UserID": row.get("user_id"),
        "PayerBank": row.get("payer_bank"),
        "PayerName": row.get("payer_name"),
        "PaymentTime": row.get("payment_time") or row.get("created_at"),
        "OrderNumber": row.get("order_number"),
        "AmountPaid": float(row.get("amount_paid", 0) or 0),
        "PaymentMethod": row.get("payment_method"),
        "PaymentStatus": row.get("status") or "success",
        "CreditAwarded": int(credit_awarded or 0),
        "TransactionType": "Payment",
        "Remark": row.get("remark"),
    }


def _credit_log_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map credit_log table row to API format.
    Schema: log_id (int), user_id (int), source_type, source_id (int),
            change_amount (int), balance_after (int), created_at
    """
    return {
        "LogID": row.get("log_id"),
        "UserID": row.get("user_id"),
        "SourceType": row.get("source_type"),
        "SourceID": row.get("source_id"),
        "ChangeAmount": row.get("change_amount"),
        "BalanceAfter": row.get("balance_after"),
        "Timestamp": row.get("created_at"),
    }


def _reward_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map credit_shop table row to API format.
    Schema: shop_item_id (int), item_name, item_description, credit_cost (int),
            stock (int), status, created_at
    """
    status = (row.get("status") or "active").lower()
    return {
        "RewardID": str(row.get("shop_item_id")),  # Convert int to string for API
        "Type": row.get("item_name"),
        "CreditCost": int(row.get("credit_cost", 0) or 0),
        "Description": row.get("item_description"),
        "Icon": None,  # Not in schema
        "Active": status == "active",
    }


def _redemption_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map redemptions table row to API format.
    Schema: id, user_id, reward_id, redemption_type, amount, description, created_at
    """
    return {
        "RedemptionID": row.get("id"),
        "UserID": row.get("user_id"),
        "RewardID": row.get("reward_id"),
        "RedemptionType": row.get("redemption_type"),
        "Amount": int(row.get("amount", 0) or 0),
        "CreditSpent": int(row.get("amount", 0) or 0),  # Alias for Amount
        "RedemptionDate": row.get("created_at"),
        "RewardStatus": "Claimed",
        "Description": row.get("description"),
    }


def _leaderboard_to_api(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map leaderboard table row to API format.
    Schema: user_id (int), total_credit_earned (int), total_redeemed (int), last_updated
    """
    return {
        "UserID": row.get("user_id"),
        "TotalCreditEarned": int(row.get("total_credit_earned", 0) or 0),
        "TotalRedeemed": int(row.get("total_redeemed", 0) or 0),
        "LastUpdated": row.get("last_updated"),
    }

# ---------- Public operations ----------

# Users

def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    sb = get_client()
    res = sb.table(T_USER).select("*").eq("id", user_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    # Get current credit from rewards table (total_credits field)
    current_credit = _recalc_user_credit(sb, user_id)
    return _user_to_api(row, current_credit=current_credit)


def list_users() -> List[Dict[str, Any]]:
    sb = get_client()
    res = sb.table(T_USER).select("*").order("id").execute()
    out = []
    for r in (res.data or []):
        # Get current credit from rewards table for each user
        current_credit = _recalc_user_credit(sb, r.get("id"))
        api = _user_to_api(r, current_credit=current_credit)
        out.append(api)
    return out


def create_user(username: str, email: str, password_hash: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user profile.
    Note: In production, users are created via Supabase Auth, not directly.
    """
    sb = get_client()
    now = datetime.utcnow().isoformat()
    payload = {
        "full_name": username,
        "email": email,
        "created_at": now,
    }
    res = sb.table(T_USER).insert(payload).select("*").single().execute()
    
    # Credits are now stored in profiles.credits field (initialized to 0 by default)
    # No need to create separate rewards record
    
    return _user_to_api(res.data, current_credit=0)

def ensure_user(user_id: str, email: str, username: Optional[str] = None) -> Dict[str, Any]:
    """Ensure a profile row exists for the given auth user id.

    - If a row with id exists, update email/full_name if provided and return it.
    - Otherwise, insert a new row with explicit id.
    """
    sb = get_client()
    # Try fetch by id - use limit(1) instead of single() to avoid error when no results
    existing_rows = sb.table(T_USER).select("*").eq("id", user_id).limit(1).execute().data
    existing = existing_rows[0] if existing_rows else None
    
    now = datetime.utcnow().isoformat()
    if existing:
        updates: Dict[str, Any] = {}
        if email and existing.get("email") != email:
            updates["email"] = email
        if username and (existing.get("full_name") or existing.get("username")) != username:
            updates["full_name"] = username
        if updates:
            sb.table(T_USER).update(updates).eq("id", user_id).execute()
            existing.update(updates)
        # Get current credit from rewards table
        current_credit = _recalc_user_credit(sb, user_id)
        return _user_to_api(existing, current_credit=current_credit)

    # Insert with explicit id
    payload = {
        "id": user_id,
        "full_name": username or (email.split("@")[0] if email else None),
        "email": email,
        "created_at": now,
    }
    res = sb.table(T_USER).insert(payload).execute()
    new_user = res.data[0] if res.data else None
    if not new_user:
        raise ValueError("Failed to create user")
    
    # Credits are now stored in profiles.credits field
    # Fetch the actual credit value from the database
    current_credit = _recalc_user_credit(sb, user_id)
    
    return _user_to_api(new_user, current_credit=current_credit)

# Admin/maintenance: purge a user's data by email
def delete_user_by_email(email: str) -> Dict[str, Any]:
    """Delete all records associated with profiles.email == email.

    Affected tables (by user_id):
    - redemptions, credit_log, credits, payments, bills, leaderboard, profiles

    Returns a summary including the list of deleted user IDs.
    """
    sb = get_client()
    # Find all profiles matching the email
    prof_res = sb.table(T_USER).select("id, email").eq("email", email).execute()
    users = prof_res.data or []
    if not users:
        return {"status": "ok", "user_ids": [], "note": "no profiles matched"}

    deleted_ids = []
    for u in users:
        uid = u.get("id")
        if not uid:
            continue
        deleted_ids.append(uid)

        # Convert UUID to integer for credit_log and leaderboard tables
        # These tables use integer user_id instead of uuid
        user_id_int = int(uid.replace('-', '')[:9], 16) % 2147483647

        # Fetch bill ids for this user to delete payments referencing bills
        bills = sb.table(T_BILL).select("id").eq("user_id", uid).execute().data or []
        bill_ids = [b.get("id") for b in bills if b.get("id")]

        # Delete redemptions
        try:
            sb.table(T_REDEMPTION).delete().eq("user_id", uid).execute()
        except Exception:
            pass
        # Delete credit logs (uses integer user_id)
        try:
            sb.table(T_CREDIT_LOG).delete().eq("user_id", user_id_int).execute()
        except Exception:
            pass
        # Delete credits ledger entries
        try:
            sb.table(T_CREDITS).delete().eq("user_id", uid).execute()
        except Exception:
            pass
        # Delete payments directly linked by user_id
        try:
            sb.table(T_PAYMENT).delete().eq("user_id", uid).execute()
        except Exception:
            pass
        # Delete payments linked via bill_id
        if bill_ids:
            try:
                sb.table(T_PAYMENT).delete().in_("bill_id", bill_ids).execute()  # type: ignore[attr-defined]
            except Exception:
                pass
        # Delete bills
        try:
            sb.table(T_BILL).delete().eq("user_id", uid).execute()
        except Exception:
            pass
        # Delete leaderboard rows if present (uses integer user_id)
        try:
            sb.table(T_LEADERBOARD).delete().eq("user_id", user_id_int).execute()
        except Exception:
            pass
        # Finally delete profile
        try:
            sb.table(T_USER).delete().eq("id", uid).execute()
        except Exception:
            pass

    return {"status": "ok", "user_ids": deleted_ids}

def init_user(user_id: str, email: str, username: Optional[str] = None) -> Dict[str, Any]:
    """Initialize user-related tables.

    Idempotent:
    - Ensures profile exists/updated (ensure_user)
    - Ensures leaderboard row exists (optional, uses integer user_id)
    - Ensures rewards record exists for credit balance
    Returns the profile API dict with CurrentCredit computed.
    """
    sb = get_client()
    profile = ensure_user(user_id=user_id, email=email, username=username)

    # Leaderboard row - Schema: leaderboard(user_id int, total_credit_earned, total_redeemed, last_updated)
    # Note: leaderboard.user_id is integer, but profiles.id is uuid - we hash it
    try:
        user_id_int = int(user_id.replace('-', '')[:9], 16) % 2147483647
        lb = sb.table(T_LEADERBOARD).select("*").eq("user_id", user_id_int).limit(1).execute().data or []
        if not lb:
            now = datetime.utcnow().isoformat()
            sb.table(T_LEADERBOARD).insert({
                "user_id": user_id_int,
                "total_credit_earned": 0,
                "total_redeemed": 0,
                "last_updated": now,
            }).execute()
    except Exception as e:
        # Leaderboard is optional, log but continue
        print(f"Warning: Could not initialize leaderboard for user {user_id}: {e}")

    # Ensure rewards record exists - Schema: rewards(id, user_id, total_credits)
    try:
        reward_rows = sb.table(T_CREDITS).select("id").eq("user_id", user_id).limit(1).execute().data or []
        if not reward_rows:
            sb.table(T_CREDITS).insert({
                "user_id": user_id,
                "total_credits": 0
            }).execute()
    except Exception as e:
        print(f"Warning: Could not initialize rewards for user {user_id}: {e}")

    # Get current credit from rewards table
    current_credit = _recalc_user_credit(sb, user_id)
    profile["CurrentCredit"] = current_credit
    return profile

# Bills

def create_bill(user_id: str, title: str, amount: float, due_date: date, category: str,
                description: Optional[str] = None, receiver_bank: Optional[str] = None,
                receiver_name: Optional[str] = None) -> Dict[str, Any]:
    sb = get_client()
    now = datetime.utcnow().isoformat()
    payload = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "receiver_bank": receiver_bank,
        "receiver_name": receiver_name,
        "amount": amount,
        "due_date": due_date.isoformat() if isinstance(due_date, date) else due_date,
        "status": "Pending",
        "category": category,
        "created_at": now,
    }
    res = sb.table(T_BILL).insert(payload).select("*").single().execute()
    return _bill_to_api(res.data)


def get_bill(bill_id: str) -> Optional[Dict[str, Any]]:
    sb = get_client()
    res = sb.table(T_BILL).select("*").eq("id", bill_id).single().execute()
    row = res.data
    return _bill_to_api(row) if row else None


def list_bills(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_client()
    q = sb.table(T_BILL).select("*")
    if user_id is not None:
        q = q.eq("user_id", user_id)
    res = q.order("id").execute()
    return [_bill_to_api(r) for r in (res.data or [])]

# Payments + credit awarding

def _recalc_user_credit(sb: Client, user_id: str) -> int:
    """
    Calculate user's current credit balance from the profiles table.
    The 'profiles' table stores user credit balances in the 'credits' field.
    """
    # Fetch the user's profile record (which stores credit balance)
    profile = sb.table(T_USER).select("credits").eq("id", user_id).execute().data or []
    # Get credits from profile (should be just one row)
    if profile:
        balance = int(float(profile[0].get("credits", 0) or 0))
    else:
        balance = 0
    return balance


def create_payment(bill_id: str, amount_paid: float, payment_method: str,
                   payer_name: Optional[str] = None, payer_bank: Optional[str] = None,
                   order_number: Optional[str] = None, remark: Optional[str] = None) -> Dict[str, Any]:
    sb = get_client()
    # Fetch bill and user
    bill = _safe_single(sb.table(T_BILL).select("*").eq("id", bill_id))
    if not bill:
        raise ValueError("Bill not found")
    user_id = bill["user_id"]
    # Compute credits from category rule
    category = (bill.get("category") or "rent").lower()
    rate_by_cat = {"rent": 5.0, "utility": 3.0, "subscription": 2.0}
    reward_rate = rate_by_cat.get(category, 5.0)
    credit_awarded = int(float(amount_paid) * reward_rate / 100.0)

    now = datetime.utcnow().isoformat()

    # Insert payment
    p_row = {
        "bill_id": bill_id,
        "user_id": user_id,
        "payer_bank": payer_bank,
        "payer_name": payer_name,
        "payment_time": now,
        "order_number": order_number,
        "amount_paid": float(amount_paid),
        "payment_method": payment_method,
        "remark": remark,
        "status": "success",  # Match DB default: 'success'
        "created_at": now,
    }
    payment_res = sb.table(T_PAYMENT).insert(p_row).execute()
    payment = payment_res.data[0] if payment_res.data else None
    if not payment:
        raise ValueError("Failed to create payment")

    # Update bill status to 'paid' (match DB schema: lowercase)
    sb.table(T_BILL).update({"status": "paid"}).eq("id", bill_id).execute()

    # Update user's credit balance in the profiles table
    # Schema: profiles(id, credits numeric)
    profile = sb.table(T_USER).select("credits").eq("id", user_id).execute().data
    
    if profile:
        # Update existing profile credits
        current_total = float(profile[0].get("credits", 0) or 0)
        new_total = current_total + credit_awarded
        sb.table(T_USER).update({
            "credits": new_total
        }).eq("id", user_id).execute()
        balance_after = int(new_total)
    else:
        # Profile should exist, but if not, initialize credits
        sb.table(T_USER).update({
            "credits": credit_awarded
        }).eq("id", user_id).execute()
        balance_after = credit_awarded

    # Credit log (credit_log.user_id is integer, profiles.id is uuid)
    # Convert UUID to int hash for compatibility
    try:
        # Simple hash: take first 9 chars of uuid (no dashes), convert to int
        user_id_int = int(user_id.replace('-', '')[:9], 16) % 2147483647
        sb.table(T_CREDIT_LOG).insert({
            "user_id": user_id_int,
            "source_type": "Payment",
            "source_id": None,  # source_id is integer in schema, payment.id is uuid
            "change_amount": credit_awarded,
            "balance_after": balance_after,
            "created_at": now,
        }).execute()
    except Exception as e:
        # Credit log is optional, continue even if it fails
        print(f"Warning: Could not insert into credit_log: {e}")

    return _payment_to_api(payment, credit_awarded=credit_awarded)


def list_payments(user_id: Optional[str] = None, bill_id: Optional[str] = None) -> List[Dict[str, Any]]:
    sb = get_client()
    q = sb.table(T_PAYMENT).select("*")
    if user_id is not None:
        q = q.eq("user_id", user_id)
    if bill_id is not None:
        q = q.eq("bill_id", bill_id)
    res = q.order("id").execute()
    rows = res.data or []
    # We don't store credit_awarded on payment row; recompute per bill rate for response
    out: List[Dict[str, Any]] = []
    for r in rows:
        # try retrieve bill to compute
        try:
            b = sb.table(T_BILL).select("category, amount").eq("id", r.get("bill_id")).single().execute().data
            category = (b.get("category") or "rent").lower() if b else "rent"
            rate_by_cat = {"rent": 5.0, "utility": 3.0, "subscription": 2.0}
            credit_awarded = int(float(r.get("amount_paid", 0) or 0) * rate_by_cat.get(category, 5.0) / 100.0)
        except Exception:
            credit_awarded = 0
        out.append(_payment_to_api(r, credit_awarded=credit_awarded))
    return out

def get_payment(payment_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a single payment row and map to API shape."""
    sb = get_client()
    res = sb.table(T_PAYMENT).select("*").eq("id", payment_id).single().execute()
    row = res.data
    if not row:
        return None
    # Compute credit_awarded similar to list_payments
    try:
        b = sb.table(T_BILL).select("category, amount").eq("id", row.get("bill_id")).single().execute().data
        category = (b.get("category") or "rent").lower() if b else "rent"
        rate_by_cat = {"rent": 5.0, "utility": 3.0, "subscription": 2.0}
        credit_awarded = int(float(row.get("amount_paid", 0) or 0) * rate_by_cat.get(category, 5.0) / 100.0)
    except Exception:
        credit_awarded = 0
    return _payment_to_api(row, credit_awarded=credit_awarded)

# Credit logs

def list_credit_logs(user_id: str) -> List[Dict[str, Any]]:
    sb = get_client()
    # Try credit_log first (legacy numeric user_id), then fall back to credits table
    try:
        # Convert UUID to integer for credit_log table
        user_id_int = int(user_id.replace('-', '')[:9], 16) % 2147483647
        res = sb.table(T_CREDIT_LOG).select("*").eq("user_id", user_id_int).order("log_id").execute()
        rows = res.data or []
        if rows:
            return [_credit_log_to_api(r) for r in rows]
    except Exception:
        pass
    # fallback: map credits rows to credit log-like structures
    # rewards table has: id, user_id, total_credits (NO created_at field)
    res2 = sb.table(T_CREDITS).select("*").eq("user_id", user_id).execute()
    rows2 = res2.data or []
    out = []
    for r in rows2:
        out.append(_credit_log_to_api({
            "log_id": r.get("id"),
            "user_id": r.get("user_id"),
            "source_type": "CreditEntry",
            "source_id": None,
            "change_amount": r.get("total_credits"),
            "balance_after": r.get("total_credits"),
            "created_at": None,
        }))
    return out

# Rewards

def create_reward(type_: str, credit_cost: int, description: Optional[str] = None, icon: Optional[str] = None) -> Dict[str, Any]:
    sb = get_client()
    now = datetime.utcnow().isoformat()
    payload = {
        "item_name": type_,
        "item_description": description,
        "credit_cost": int(credit_cost),
        "stock": 9999,  # default large stock unless managed separately
        "status": "active",
        "created_at": now,
        # Note: icon field not in credit_shop table, omitted
    }
    res = sb.table(T_CREDIT_SHOP).insert(payload).execute()
    # Get the inserted data - insert returns list of rows
    row = res.data[0] if res.data else None
    if not row:
        raise ValueError("Failed to create reward")
    return _reward_to_api(row)


def get_reward(reward_id: str) -> Optional[Dict[str, Any]]:
    sb = get_client()
    # try numeric shop_item_id first
    try:
        sid = int(reward_id)
        row = _safe_single(sb.table(T_CREDIT_SHOP).select("*").eq("shop_item_id", sid))
        return _reward_to_api(row) if row else None
    except Exception:
        # fallback: try to find by other identifier (not implemented)
        row = _safe_single(sb.table(T_CREDIT_SHOP).select("*").eq("shop_item_id", reward_id))
        return _reward_to_api(row) if row else None


def list_rewards(active: Optional[bool] = None) -> List[Dict[str, Any]]:
    sb = get_client()
    q = sb.table(T_CREDIT_SHOP).select("*")
    if active is not None:
        if active:
            q = q.in_("status", ["active", "enabled", "available"])  # type: ignore[attr-defined]
        else:
            q = q.in_("status", ["inactive", "disabled"])  # type: ignore[attr-defined]
    res = q.order("shop_item_id").execute()
    return [_reward_to_api(r) for r in (res.data or [])]

# Redemption + debit credits

def redeem_reward(user_id: str, reward_id: str) -> Dict[str, Any]:
    sb = get_client()
    now = datetime.utcnow().isoformat()

    # Fetch user profile
    user_row = _safe_single(sb.table(T_USER).select("*").eq("id", user_id))
    if not user_row:
        raise ValueError("User not found")

    # Determine shop item: reward_id may be numeric shop_item_id or uuid; try numeric first
    shop_item = None
    shop_item_id = None
    try:
        shop_item_id = int(reward_id)
        shop_item = _safe_single(sb.table(T_CREDIT_SHOP).select("*").eq("shop_item_id", shop_item_id))
    except Exception:
        shop_item = None

    if not shop_item:
        # fallback: try to match by shop item name or other identifier
        shop_item = _safe_single(sb.table(T_CREDIT_SHOP).select("*").eq("shop_item_id", reward_id))

    if not shop_item:
        raise ValueError("Reward not found")

    status = (shop_item.get("status") or "active").lower()
    if status not in ("active", "enabled", "available"):
        raise ValueError("Reward not active")

    cost = int(shop_item.get("credit_cost", 0) or 0)
    
    # Get user's current credit balance from rewards table
    balance = _recalc_user_credit(sb, user_id)
    if balance < cost:
        raise ValueError("Insufficient credit")

    # Insert redemption into redemptions table (SQL schema uses reward_id uuid; we'll store reference in description)
    red_payload = {
        "user_id": user_id,
        "reward_id": None,
        "redemption_type": "credit_shop",
        "amount": cost,
        "description": f"shop_item:{shop_item.get('shop_item_id')}",
        "created_at": now,
    }
    red_res = sb.table(T_REDEMPTION).insert(red_payload).execute()
    red = red_res.data[0] if red_res.data else None
    if not red:
        raise ValueError("Failed to create redemption")

    # Update user's credit balance in profiles table
    new_balance = balance - cost
    sb.table(T_USER).update({
        "credits": new_balance
    }).eq("id", user_id).execute()

    # Credit log (-) - handle integer user_id type mismatch
    try:
        sb.table(T_CREDIT_LOG).insert({
            "user_id": int(user_id.replace('-', '')[:9], 16) % 2147483647,
            "source_type": "Redemption",
            "source_id": shop_item.get("shop_item_id"),
            "change_amount": -cost,
            "balance_after": new_balance,
            "created_at": now,
        }).execute()
    except Exception as e:
        # If credit_log fails (type mismatch), skip it but continue
        print(f"Warning: Could not insert into credit_log: {e}")

    # Return redemption record
    return _redemption_to_api(red)

# Redemptions

def list_redemptions(user_id: str) -> List[Dict[str, Any]]:
    sb = get_client()
    res = sb.table(T_REDEMPTION).select("*").eq("user_id", user_id).order("id").execute()
    return [_redemption_to_api(r) for r in (res.data or [])]

# Leaderboard

def get_leaderboard(limit: int = 10) -> List[Dict[str, Any]]:
    sb = get_client()
    res = sb.table(T_LEADERBOARD).select("*").order("total_credit_earned", desc=True).limit(limit).execute()
    return [_leaderboard_to_api(r) for r in (res.data or [])]