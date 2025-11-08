"""Quick script to check and initialize rewards if needed."""

import sys
sys.path.insert(0, '.')

import db

def main():
    print("Checking rewards in database...")
    
    try:
        rewards = db.list_rewards()
        print(f"Found {len(rewards)} rewards in database")
        
        if len(rewards) > 0:
            print("\nExisting rewards:")
            for r in rewards:
                print(f"  - {r['Type']}: {r['CreditCost']} credits (ID: {r['RewardID']})")
            return
        
        print("\nNo rewards found. Creating sample rewards...")
        
        sample_rewards = [
            {
                "type_": "Coffee Voucher",
                "credit_cost": 50,
                "description": "Free coffee at participating cafes",
                "icon": "☕"
            },
            {
                "type_": "Utility Credit £10",
                "credit_cost": 200,
                "description": "£10 credit towards your utility bills",
                "icon": "⚡"
            },
            {
                "type_": "Premium Month",
                "credit_cost": 400,
                "description": "One month of premium account features",
                "icon": "⭐"
            },
            {
                "type_": "Rent Discount 5%",
                "credit_cost": 500,
                "description": "5% discount on your next rent payment",
                "icon": "🏠"
            },
            {
                "type_": "Google Play Gift Card £25",
                "credit_cost": 500,
                "description": "£25 Google Play credit",
                "icon": "🎮"
            },
            {
                "type_": "Amazon Gift Card £25",
                "credit_cost": 500,
                "description": "£25 Amazon voucher",
                "icon": "📦"
            },
            {
                "type_": "Apple Gift Card £50",
                "credit_cost": 1000,
                "description": "£50 Apple gift card",
                "icon": "🍎"
            },
            {
                "type_": "Google Play Gift Card £50",
                "credit_cost": 1000,
                "description": "£50 Google Play credit",
                "icon": "🎮"
            },
            {
                "type_": "Apple Gift Card £100",
                "credit_cost": 2000,
                "description": "£100 Apple gift card",
                "icon": "💎"
            },
        ]
        
        for reward in sample_rewards:
            created = db.create_reward(**reward)
            print(f"  ✅ Created: {created['Type']} ({created['CreditCost']} credits)")
        
        print(f"\n✅ Created {len(sample_rewards)} rewards!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
