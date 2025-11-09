"""Initialize UK Bank Cards.

This script creates 10 UK bank cards with £1000 each.
Run this script to populate the bank database.
"""
from bank_db import create_bank_card, list_bank_cards, delete_all_cards

# UK bank card data - 10 cards with different UK banks
UK_BANK_CARDS = [
    {
        "card_number": "4532015112830366",
        "card_holder_name": "James Wilson",
        "sort_code": "20-00-00",
        "account_number": "12345678",
        "bank_name": "Barclays",
        "card_type": "Debit",
    },
    {
        "card_number": "4539791001730106",
        "card_holder_name": "Emma Thompson",
        "sort_code": "40-47-84",
        "account_number": "23456789",
        "bank_name": "HSBC",
        "card_type": "Debit",
    },
    {
        "card_number": "4556474670906442",
        "card_holder_name": "Oliver Brown",
        "sort_code": "60-83-71",
        "account_number": "34567890",
        "bank_name": "Lloyds Bank",
        "card_type": "Debit",
    },
    {
        "card_number": "4929939187355598",
        "card_holder_name": "Sophie Taylor",
        "sort_code": "30-96-26",
        "account_number": "45678901",
        "bank_name": "NatWest",
        "card_type": "Debit",
    },
    {
        "card_number": "4485040371536584",
        "card_holder_name": "Harry Davies",
        "sort_code": "16-58-30",
        "account_number": "56789012",
        "bank_name": "Santander UK",
        "card_type": "Debit",
    },
    {
        "card_number": "4024007136512380",
        "card_holder_name": "Charlotte Evans",
        "sort_code": "23-05-80",
        "account_number": "67890123",
        "bank_name": "Royal Bank of Scotland",
        "card_type": "Debit",
    },
    {
        "card_number": "4532261615476013",
        "card_holder_name": "George Martin",
        "sort_code": "09-01-28",
        "account_number": "78901234",
        "bank_name": "Metro Bank",
        "card_type": "Debit",
    },
    {
        "card_number": "4916338506082832",
        "card_holder_name": "Isabella Clark",
        "sort_code": "04-00-04",
        "account_number": "89012345",
        "bank_name": "Nationwide",
        "card_type": "Debit",
    },
    {
        "card_number": "4539678673064322",
        "card_holder_name": "Jack Robinson",
        "sort_code": "77-81-99",
        "account_number": "90123456",
        "bank_name": "TSB Bank",
        "card_type": "Debit",
    },
    {
        "card_number": "4485382467536426",
        "card_holder_name": "Amelia Walker",
        "sort_code": "11-02-89",
        "account_number": "01234567",
        "bank_name": "Monzo",
        "card_type": "Debit",
    },
]


def init_bank_cards(reset: bool = False):
    """Initialize bank cards in the database.
    
    Args:
        reset: If True, delete all existing cards before creating new ones
    """
    print("🏦 UK Bank Card System - Initialization")
    print("=" * 50)
    
    if reset:
        print("\n⚠️  Resetting database - deleting all existing cards...")
        result = delete_all_cards()
        print(f"✓ Deleted {result.get('deleted', 0)} cards")
    
    print(f"\n📝 Creating {len(UK_BANK_CARDS)} UK bank cards...")
    print("-" * 50)
    
    created_count = 0
    for card_data in UK_BANK_CARDS:
        try:
            card = create_bank_card(
                card_number=card_data["card_number"],
                card_holder_name=card_data["card_holder_name"],
                sort_code=card_data["sort_code"],
                account_number=card_data["account_number"],
                balance=1000.00,  # £1000 initial balance
                bank_name=card_data["bank_name"],
                card_type=card_data["card_type"],
            )
            created_count += 1
            print(f"✓ Created card for {card_data['card_holder_name']:20} | "
                  f"{card_data['bank_name']:20} | "
                  f"Balance: £1000.00")
        except Exception as e:
            print(f"✗ Failed to create card for {card_data['card_holder_name']}: {e}")
    
    print("-" * 50)
    print(f"✅ Successfully created {created_count}/{len(UK_BANK_CARDS)} bank cards")
    
    # List all cards to verify
    print("\n📊 Current Bank Cards in Database:")
    print("-" * 50)
    cards = list_bank_cards()
    total_balance = 0
    
    for i, card in enumerate(cards, 1):
        balance = float(card.get("balance", 0))
        total_balance += balance
        print(f"{i:2}. {card.get('card_holder_name'):20} | "
              f"{card.get('bank_name'):20} | "
              f"Card: ****{card.get('card_number', '')[-4:]} | "
              f"Balance: £{balance:.2f}")
    
    print("-" * 50)
    print(f"📈 Total Balance Across All Cards: £{total_balance:.2f}")
    print(f"💳 Total Cards: {len(cards)}")
    print("\n✨ Initialization complete!")


if __name__ == "__main__":
    import sys
    
    # Check if --reset flag is provided
    reset = "--reset" in sys.argv or "-r" in sys.argv
    
    try:
        init_bank_cards(reset=reset)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Make sure you have set BANK_SUPABASE_URL and BANK_SUPABASE_KEY in your .env file")
        sys.exit(1)
