"""Reward system API router now backed by Supabase (db.py).

Replaces prior in-memory implementation. Each endpoint delegates to db.py CRUD
helpers that map database rows to the alias-based API schema required by the
frontend (`UserID`, `BillID`, etc.).

If Supabase environment variables are missing (SUPABASE_URL & SUPABASE_KEY),
the first attempted DB operation will raise; we translate those into HTTP 500.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

from db import (
    create_user as db_create_user,
    ensure_user as db_ensure_user,
    delete_user_by_email as db_delete_user_by_email,
    get_user as db_get_user,
    list_users as db_list_users,
    create_bill as db_create_bill,
    get_bill as db_get_bill,
    list_bills as db_list_bills,
    create_payment as db_create_payment,
    get_payment as db_get_payment,
    list_payments as db_list_payments,
    list_credit_logs as db_list_credit_logs,
    create_reward as db_create_reward,
    get_reward as db_get_reward,
    list_rewards as db_list_rewards,
    redeem_reward as db_redeem_reward,
    list_redemptions as db_list_redemptions,
    get_leaderboard as db_get_leaderboard,
)
from db import get_env_status

router = APIRouter(prefix="/api/reward", tags=["reward"])


# ========== Models (matching Tables Statement) ==========

class User(BaseModel):
    user_id: str = Field(..., alias="UserID")
    username: str = Field(..., alias="UserName")
    email: str = Field(..., alias="Email")
    password_hash: Optional[str] = Field(None, alias="PasswordHash")
    current_credit: int = Field(0, alias="CurrentCredit")
    joined_at: str = Field(..., alias="JoinedAt")

    class Config:
        populate_by_name = True


class Bill(BaseModel):
    bill_id: str = Field(..., alias="BillID")
    user_id: str = Field(..., alias="UserID")
    title: str = Field(..., alias="Title")
    description: Optional[str] = Field(None, alias="Description")
    receiver_bank: Optional[str] = Field(None, alias="ReceiverBank")
    receiver_name: Optional[str] = Field(None, alias="ReceiverName")
    amount: float = Field(..., alias="Amount")
    due_date: str = Field(..., alias="DueDate")
    status: str = Field(..., alias="Status")
    payment_status: str = Field(..., alias="PaymentStatus")
    category: str = Field(..., alias="Category")
    reward_rate: float = Field(..., alias="RewardRate")
    reward_earned: int = Field(..., alias="RewardEarned")
    created_at: Optional[str] = Field(None, alias="CreatedAt")

    class Config:
        populate_by_name = True


class Payment(BaseModel):
    payment_id: str = Field(..., alias="PaymentID")
    bill_id: str = Field(..., alias="BillID")
    user_id: str = Field(..., alias="UserID")
    payer_bank: Optional[str] = Field(None, alias="PayerBank")
    payer_name: Optional[str] = Field(None, alias="PayerName")
    payment_time: str = Field(..., alias="PaymentTime")
    order_number: Optional[str] = Field(None, alias="OrderNumber")
    amount_paid: float = Field(..., alias="AmountPaid")
    payment_method: str = Field(..., alias="PaymentMethod")
    payment_status: str = Field(..., alias="PaymentStatus")
    credit_awarded: int = Field(..., alias="CreditAwarded")
    transaction_type: str = Field(..., alias="TransactionType")
    remark: Optional[str] = Field(None, alias="Remark")

    class Config:
        populate_by_name = True


class CreditLog(BaseModel):
    log_id: str = Field(..., alias="LogID")
    user_id: str = Field(..., alias="UserID")
    source_type: str = Field(..., alias="SourceType")
    source_id: Optional[str] = Field(None, alias="SourceID")
    change_amount: int = Field(..., alias="ChangeAmount")
    balance_after: int = Field(..., alias="BalanceAfter")
    timestamp: str = Field(..., alias="Timestamp")

    class Config:
        populate_by_name = True


class Reward(BaseModel):
    reward_id: str = Field(..., alias="RewardID")
    type: str = Field(..., alias="Type")
    credit_cost: int = Field(..., alias="CreditCost")
    description: Optional[str] = Field(None, alias="Description")
    icon: Optional[str] = Field(None, alias="Icon")
    active: bool = Field(..., alias="Active")

    class Config:
        populate_by_name = True


class Redemption(BaseModel):
    redemption_id: str = Field(..., alias="RedemptionID")
    user_id: str = Field(..., alias="UserID")
    reward_id: str = Field(..., alias="RewardID")
    credit_spent: int = Field(..., alias="CreditSpent")
    redemption_date: str = Field(..., alias="RedemptionDate")
    reward_status: str = Field(..., alias="RewardStatus")

    class Config:
        populate_by_name = True


class Leaderboard(BaseModel):
    user_id: str = Field(..., alias="UserID")
    total_credit_earned: int = Field(..., alias="TotalCreditEarned")
    total_redeemed: int = Field(..., alias="TotalRedeemed")
    last_updated: str = Field(..., alias="LastUpdated")

    class Config:
        populate_by_name = True


# ========== Request/Response Schemas ==========

class CreateUserRequest(BaseModel):
    username: str = Field(..., alias="UserName")
    email: str = Field(..., alias="Email")
    password_hash: Optional[str] = Field(None, alias="PasswordHash")

    class Config:
        populate_by_name = True


class CreateBillRequest(BaseModel):
    user_id: str = Field(..., alias="UserID")
    title: str = Field(..., alias="Title")
    description: Optional[str] = Field(None, alias="Description")
    receiver_bank: Optional[str] = Field(None, alias="ReceiverBank")
    receiver_name: Optional[str] = Field(None, alias="ReceiverName")
    amount: float = Field(..., gt=0, alias="Amount")
    due_date: date = Field(..., alias="DueDate")
    category: str = Field(..., alias="Category")

    class Config:
        populate_by_name = True


class CreatePaymentRequest(BaseModel):
    bill_id: str = Field(..., alias="BillID")
    payer_bank: Optional[str] = Field(None, alias="PayerBank")
    payer_name: Optional[str] = Field(None, alias="PayerName")
    order_number: Optional[str] = Field(None, alias="OrderNumber")
    amount_paid: float = Field(..., gt=0, alias="AmountPaid")
    payment_method: str = Field(..., alias="PaymentMethod")
    remark: Optional[str] = Field(None, alias="Remark")

    class Config:
        populate_by_name = True


class CreateRewardRequest(BaseModel):
    type: str = Field(..., alias="Type")
    credit_cost: int = Field(..., gt=0, alias="CreditCost")
    description: Optional[str] = Field(None, alias="Description")
    icon: Optional[str] = Field(None, alias="Icon")

    class Config:
        populate_by_name = True


class RedeemRewardRequest(BaseModel):
    user_id: str = Field(..., alias="UserID")
    reward_id: str = Field(..., alias="RewardID")
class EnsureUserRequest(BaseModel):
    user_id: str = Field(..., alias="UserID")
    email: str = Field(..., alias="Email")
    username: Optional[str] = Field(None, alias="UserName")

    class Config:
        populate_by_name = True

class InitUserRequest(BaseModel):
    user_id: str = Field(..., alias="UserID")
    email: str = Field(..., alias="Email")
    username: Optional[str] = Field(None, alias="UserName")

    class Config:
        populate_by_name = True


    class Config:
        populate_by_name = True


# ========== Helper Functions ==========

# (No local helper functions; credit logic handled in db.py.)


# ========== Endpoints ==========

# --- User ---
@router.post("/users", response_model=User)
def create_user(payload: CreateUserRequest):
    try:
        data = db_create_user(payload.username, payload.email, payload.password_hash)
        return User(**data)  # type: ignore[arg-type]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}", response_model=User)
def get_user(user_id: str):
    data = db_get_user(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**data)  # type: ignore[arg-type]


@router.get("/users", response_model=List[User])
def list_users():
    return [User(**u) for u in db_list_users()]  # type: ignore[list-item]


# --- Bill ---
@router.post("/bills", response_model=Bill)
def create_bill(payload: CreateBillRequest):
    try:
        data = db_create_bill(
            user_id=payload.user_id,
            title=payload.title,
            amount=payload.amount,
            due_date=payload.due_date,
            category=payload.category,
            description=payload.description,
            receiver_bank=payload.receiver_bank,
            receiver_name=payload.receiver_name,
        )
        return Bill(**data)  # type: ignore[arg-type]
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bills/{bill_id}", response_model=Bill)
def get_bill(bill_id: str):
    data = db_get_bill(bill_id)
    if not data:
        raise HTTPException(status_code=404, detail="Bill not found")
    return Bill(**data)  # type: ignore[arg-type]


@router.get("/bills", response_model=List[Bill])
def list_bills(user_id: Optional[str] = None):
    return [Bill(**b) for b in db_list_bills(user_id)]  # type: ignore[list-item]


# --- Payment ---
@router.post("/payments", response_model=Payment)
def create_payment(payload: CreatePaymentRequest):
    try:
        data = db_create_payment(
            bill_id=payload.bill_id,
            amount_paid=payload.amount_paid,
            payment_method=payload.payment_method,
            payer_name=payload.payer_name,
            payer_bank=payload.payer_bank,
            order_number=payload.order_number,
            remark=payload.remark,
        )
        return Payment(**data)  # type: ignore[arg-type]
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payments/{payment_id}", response_model=Payment)
def get_payment(payment_id: str):
    data = db_get_payment(payment_id)
    if not data:
        raise HTTPException(status_code=404, detail="Payment not found")
    return Payment(**data)  # type: ignore[arg-type]


@router.get("/payments", response_model=List[Payment])
def list_payments(user_id: Optional[str] = None, bill_id: Optional[str] = None):
    return [Payment(**p) for p in db_list_payments(user_id=user_id, bill_id=bill_id)]  # type: ignore[list-item]


# --- CreditLog ---
@router.get("/credit_logs/{user_id}", response_model=List[CreditLog])
def list_credit_logs(user_id: str):
    return [CreditLog(**l) for l in db_list_credit_logs(user_id)]  # type: ignore[list-item]


# --- Reward ---
@router.post("/rewards", response_model=Reward)
def create_reward(payload: CreateRewardRequest):
    try:
        data = db_create_reward(
            type_=payload.type,
            credit_cost=payload.credit_cost,
            description=payload.description,
            icon=payload.icon,
        )
        return Reward(**data)  # type: ignore[arg-type]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rewards/{reward_id}", response_model=Reward)
def get_reward(reward_id: str):
    data = db_get_reward(reward_id)
    if not data:
        raise HTTPException(status_code=404, detail="Reward not found")
    return Reward(**data)  # type: ignore[arg-type]


@router.get("/rewards", response_model=List[Reward])
def list_rewards(active: Optional[bool] = None):
    return [Reward(**r) for r in db_list_rewards(active)]  # type: ignore[list-item]


# --- Redemption ---
@router.post("/redemptions", response_model=Redemption)
def redeem_reward(payload: RedeemRewardRequest):
    try:
        data = db_redeem_reward(user_id=payload.user_id, reward_id=payload.reward_id)
        return Redemption(**data)  # type: ignore[arg-type]
    except ValueError as ve:
        # Business logic errors
        msg = str(ve)
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=msg)
        elif "Insufficient" in msg or "active" in msg:
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/redemptions/{user_id}", response_model=List[Redemption])
def list_redemptions(user_id: str):
    return [Redemption(**r) for r in db_list_redemptions(user_id)]  # type: ignore[list-item]


# --- Leaderboard ---
@router.get("/leaderboard", response_model=List[Leaderboard])
def get_leaderboard(limit: int = 10):
    return [Leaderboard(**l) for l in db_get_leaderboard(limit)]  # type: ignore[list-item]


# ========== Seed Demo Data ==========

# No seeding in DB-backed mode.


# ========== Admin/Maintenance ==========

@router.delete("/users/by-email")
def delete_user_by_email(email: str):
    """Delete all records for the given email across related tables.

    WARNING: This is a destructive operation intended for maintenance/testing.
    """
    try:
        return db_delete_user_by_email(email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/diagnostics/supabase")
def diagnostics_supabase():
    """Return basic environment/connection diagnostics (no secrets)."""
    try:
        status = get_env_status()
        return {"status": "ok", **status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/ensure", response_model=User)
def ensure_user(payload: EnsureUserRequest):
    try:
        data = db_ensure_user(user_id=payload.user_id, email=payload.email, username=payload.username)
        return User(**data)  # type: ignore[arg-type]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from db import init_user as db_init_user  # placed after pydantic models

@router.post("/users/init", response_model=User)
def init_user(payload: InitUserRequest):
    try:
        data = db_init_user(user_id=payload.user_id, email=payload.email, username=payload.username)
        return User(**data)  # type: ignore[arg-type]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
