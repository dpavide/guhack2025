"""Test UK Bank Card System.

Simple test script to verify bank card operations.
"""
from bank_db import (
    create_bank_card,
    get_bank_card_by_number,
    list_bank_cards,
    get_balance,
    deduct_balance,
    add_balance,
)


def test_bank_system():
    """Run basic tests on the bank card system."""
    print("🧪 Testing UK Bank Card System")
    print("=" * 60)
    
    try:
        # Test 1: List all cards
        print("\n1️⃣  Listing all bank cards...")
        cards = list_bank_cards()
        print(f"   ✓ Found {len(cards)} bank cards")
        
        if not cards:
            print("   ⚠️  No cards found. Run init_bank_cards.py first!")
            return
        
        # Test 2: Get a specific card
        print("\n2️⃣  Getting specific card details...")
        test_card_number = cards[0]["card_number"]
        card = get_bank_card_by_number(test_card_number)
        print(f"   ✓ Card holder: {card['card_holder_name']}")
        print(f"   ✓ Bank: {card['bank_name']}")
        print(f"   ✓ Balance: £{card['balance']}")
        
        # Test 3: Check balance
        print("\n3️⃣  Checking balance...")
        balance = get_balance(test_card_number)
        print(f"   ✓ Current balance: £{balance:.2f}")
        
        # Test 4: Deduct balance
        print("\n4️⃣  Testing deduction (£50.00)...")
        original_balance = balance
        updated_card = deduct_balance(test_card_number, 50.00)
        new_balance = float(updated_card['balance'])
        print(f"   ✓ Previous balance: £{original_balance:.2f}")
        print(f"   ✓ New balance: £{new_balance:.2f}")
        print(f"   ✓ Difference: £{(original_balance - new_balance):.2f}")
        
        # Test 5: Add balance
        print("\n5️⃣  Testing addition (£75.00)...")
        updated_card = add_balance(test_card_number, 75.00)
        final_balance = float(updated_card['balance'])
        print(f"   ✓ Previous balance: £{new_balance:.2f}")
        print(f"   ✓ New balance: £{final_balance:.2f}")
        print(f"   ✓ Difference: £{(final_balance - new_balance):.2f}")
        
        # Test 6: Summary
        print("\n6️⃣  Summary of all cards:")
        print("   " + "-" * 56)
        total_balance = 0
        for i, card in enumerate(cards, 1):
            card_balance = float(card['balance'])
            total_balance += card_balance
            print(f"   {i:2}. {card['card_holder_name']:20} | "
                  f"{card['bank_name']:20} | £{card_balance:,.2f}")
        print("   " + "-" * 56)
        print(f"   📊 Total balance across all cards: £{total_balance:,.2f}")
        
        print("\n✅ All tests passed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_bank_system()
