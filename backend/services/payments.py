from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from datetime import datetime, timezone
from supabase import create_client
import os

router = APIRouter(tags=["payments"])

# ---------- Models ----------

class PayRequest(BaseModel):
    user_id: str            # UUID string
    bill_id: str            # UUID string
    amount_paid: str        # numeric string, e.g. "19.99"
    multiplier: str         # numeric string, e.g. "1.25"

    @field_validator("amount_paid")
    @classmethod
    def _amount_ok(cls, v: str) -> str:
        try:
            Decimal(v)
        except InvalidOperation:
            raise ValueError("amount_paid must be a numeric string like '10.00'")
        return v

    @field_validator("multiplier")
    @classmethod
    def _mult_ok(cls, v: str) -> str:
        try:
            Decimal(v)
        except InvalidOperation:
            raise ValueError("multiplier must be a numeric string like '1.25'")
        return v


class PayResponse(BaseModel):
    ok: bool
    credit: str
    payment: Dict[str, Any]
    rewards: Dict[str, Any]


# ---------- Helpers ----------

def _sb():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_ANON_KEY"]
    return create_client(url, key)

def _to_dec(s: str) -> Decimal:
    return Decimal(str(s))

def _compute_credit(amount_paid: Decimal, multiplier: Decimal) -> Decimal:
    if amount_paid < 0 or multiplier < 0:
        raise ValueError("amount_paid/multiplier must be non-negative")
    return (amount_paid * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- API ----------

@router.post("/pay", response_model=PayResponse)
def record_payment(req: PayRequest):
    # 1) compute credit
    amount = _to_dec(req.amount_paid)
    mult = _to_dec(req.multiplier)
    credit = _compute_credit(amount, mult)

    sb = _sb()

    # 2) insert payment row
    payment_row = {
        "user_id": req.user_id,
        "bill_id": req.bill_id,
        "amount_paid": str(amount),
        "status": "success",
        "created_at": _utc_now_iso(),
    }

    try:
        ins = sb.table("payments").insert(payment_row).execute()
    except Exception as e:
        # Most common: FK violation (profiles/bills missing), or RLS
        raise HTTPException(status_code=500, detail=f"Supabase insert payments failed: {e}")

    if not getattr(ins, "data", None):
        raise HTTPException(status_code=500, detail="Insert into payments returned no data")
    payment = ins.data[0]

    # 3) update/create rewards for this user_id (no RPC, no table change)
    try:
        existing = sb.table("rewards") \
                     .select("id,total_credits") \
                     .eq("user_id", req.user_id) \
                     .limit(1) \
                     .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Supabase select rewards failed: {e}")

    rewards_row: Optional[Dict[str, Any]] = None
    existing_rows = getattr(existing, "data", None) or []

    if existing_rows:
        # Row exists: increment total_credits
        rid = existing_rows[0]["id"]
        current = Decimal(str(existing_rows[0].get("total_credits", "0")))
        new_total = (current + credit).quantize(Decimal("0.01"))
        try:
            upd = sb.table("rewards") \
                    .update({"total_credits": str(new_total), "last_updated": _utc_now_iso()}) \
                    .eq("id", rid) \
                    .execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase update rewards failed: {e}")

        if not getattr(upd, "data", None):
            raise HTTPException(status_code=500, detail="Update rewards returned no data")
        rewards_row = upd.data[0]
    else:
        # No row: create one with this credit as starting balance
        try:
            insr = sb.table("rewards").insert({
                "user_id": req.user_id,
                "total_credits": str(credit),
                "last_updated": _utc_now_iso(),
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Supabase insert rewards failed: {e}")

        if not getattr(insr, "data", None):
            raise HTTPException(status_code=500, detail="Insert rewards returned no data")
        rewards_row = insr.data[0]

    return PayResponse(ok=True, credit=str(credit), payment=payment, rewards=rewards_row)
