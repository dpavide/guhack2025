"""Bank Card API Router for FastAPI.

Provides endpoints for bank card validation and payment processing.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from bank_db import (
    get_bank_card_by_number,
    deduct_balance,
    get_balance,
    list_bank_cards
)

router = APIRouter(prefix="/api/bank", tags=["Bank"])


class CardValidationRequest(BaseModel):
    account_number: str  # 16-digit card number
    card_holder_name: str
    cvv: str
    expiry_date: str  # Format: MM/YY


class PaymentRequest(BaseModel):
    account_number: str  # 16-digit card number
    card_holder_name: str
    cvv: str
    expiry_date: str
    amount: float


class CardValidationResponse(BaseModel):
    valid: bool
    card_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    balance: Optional[float] = None
    message: Optional[str] = None
    masked_card_number: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    message: str
    new_balance: Optional[float] = None
    transaction_id: Optional[str] = None


def _validate_card_details(account_number: str, card_holder_name: str, 
                          cvv: str, expiry_date: str):
    """
    Internal function to validate card details for online shopping.
    Uses card number (account_number), holder name, CVV, and expiry date.
    Returns (card, error_message) tuple.
    """
    # Get card by card number (using account_number as the 16-digit card number)
    card = get_bank_card_by_number(account_number)
    
    if not card:
        return None, "Invalid card number."
    
    # Validate card holder name (case-insensitive)
    if card.get("card_holder_name", "").lower() != card_holder_name.lower():
        return None, "Card holder name does not match."
    
    # Validate CVV (in real system, CVV would be stored securely hashed)
    # For demo, we'll use last 3 digits of card number as CVV
    card_number = card.get("card_number", "")
    expected_cvv = card_number[-3:] if len(card_number) >= 3 else "123"
    if cvv != expected_cvv:
        return None, "Invalid CVV."
    
    # Validate expiry date (format MM/YY)
    # For demo, all cards expire on 12/28
    if expiry_date != "12/28":
        return None, "Invalid or expired card."
    
    # Check if card is active
    if card.get("status") != "active":
        return None, "This card is not active."
    
    return card, None


@router.post("/validate-card", response_model=CardValidationResponse)
async def validate_card(request: CardValidationRequest):
    """
    Validate a bank card for online shopping using card number, holder name, CVV and expiry date.
    This mimics UK online shopping payment validation.
    
    Returns card details if valid.
    """
    try:
        card, error = _validate_card_details(
            request.account_number,
            request.card_holder_name,
            request.cvv,
            request.expiry_date
        )
        
        if error:
            return CardValidationResponse(
                valid=False,
                message=error
            )
        
        balance = float(card.get("balance", 0))
        card_number = card.get("card_number", "")
        masked_number = f"****{card_number[-4:]}" if len(card_number) >= 4 else "****"
        
        return CardValidationResponse(
            valid=True,
            card_holder_name=card.get("card_holder_name"),
            bank_name=card.get("bank_name"),
            balance=balance,
            masked_card_number=masked_number,
            message="Card validated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating card: {str(e)}")


@router.post("/process-payment", response_model=PaymentResponse)
async def process_payment(request: PaymentRequest):
    """
    Process a payment using bank card details for online shopping.
    This mimics UK online shopping payment processing.
    
    Validates all card information, checks balance, and deducts the amount.
    """
    try:
        # Validate all card details
        card, error = _validate_card_details(
            request.account_number,
            request.card_holder_name,
            request.cvv,
            request.expiry_date
        )
        
        if error:
            return PaymentResponse(
                success=False,
                message=error
            )
        
        # Check balance
        current_balance = float(card.get("balance", 0))
        
        if current_balance < request.amount:
            return PaymentResponse(
                success=False,
                message=f"Insufficient balance. Available: £{current_balance:.2f}, Required: £{request.amount:.2f}"
            )
        
        # Process payment (deduct balance)
        card_number = card.get("card_number")
        updated_card = deduct_balance(card_number, request.amount)
        new_balance = float(updated_card.get("balance", 0))
        
        return PaymentResponse(
            success=True,
            message=f"Payment of £{request.amount:.2f} processed successfully",
            new_balance=new_balance,
            transaction_id=updated_card.get("id")
        )
        
    except ValueError as e:
        return PaymentResponse(
            success=False,
            message=str(e)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing payment: {str(e)}")


@router.get("/balance/{card_number}")
async def check_balance(card_number: str):
    """
    Check the balance of a bank card.
    """
    try:
        balance = get_balance(card_number)
        card = get_bank_card_by_number(card_number)
        
        return {
            "card_number": card_number,
            "balance": balance,
            "card_holder_name": card.get("card_holder_name") if card else None,
            "bank_name": card.get("bank_name") if card else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking balance: {str(e)}")


@router.get("/cards")
async def get_all_cards():
    """
    Get all bank cards (for testing/admin purposes).
    """
    try:
        cards = list_bank_cards()
        # Mask card numbers for security
        masked_cards = []
        for card in cards:
            masked_cards.append({
                "id": card.get("id"),
                "card_number_masked": f"****{card.get('card_number', '')[-4:]}",
                "card_holder_name": card.get("card_holder_name"),
                "bank_name": card.get("bank_name"),
                "balance": float(card.get("balance", 0)),
                "status": card.get("status")
            })
        return masked_cards
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching cards: {str(e)}")
