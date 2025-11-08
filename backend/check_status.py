#!/usr/bin/env python3
"""Project status check - verifies all core components are working."""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

def check_imports():
    """Check if all core modules can be imported."""
    print("🔍 Checking core imports...")
    try:
        import db
        print("  ✅ db.py")
        import reward
        print("  ✅ reward.py")
        from main import app
        print("  ✅ main.py")
        return True
    except Exception as e:
        print(f"  ❌ Import failed: {e}")
        return False

def check_database():
    """Check database connection and data."""
    print("\n💾 Checking database...")
    try:
        import db
        
        # Check connection
        client = db.get_client()
        print("  ✅ Database connected")
        
        # Check rewards
        rewards = db.list_rewards()
        print(f"  ✅ Found {len(rewards)} rewards")
        
        # Check users
        users = db.list_users()
        print(f"  ✅ Found {len(users)} users")
        
        return True
    except Exception as e:
        print(f"  ❌ Database check failed: {e}")
        return False

def check_files():
    """Check if all required files exist."""
    print("\n📁 Checking required files...")
    
    required_files = [
        "db.py",
        "main.py",
        "reward.py",
        "check_and_init_rewards.py",
        "requirements.txt",
        ".env",
    ]
    
    all_exist = True
    for filename in required_files:
        exists = os.path.exists(filename)
        status = "✅" if exists else "❌"
        print(f"  {status} {filename}")
        if not exists:
            all_exist = False
    
    return all_exist

def main():
    print("=" * 60)
    print("GUHack2025 - Project Status Check")
    print("=" * 60)
    
    results = []
    
    # Run checks
    results.append(("Imports", check_imports()))
    results.append(("Files", check_files()))
    results.append(("Database", check_database()))
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All checks passed! Project is ready.")
        print("\nNext steps:")
        print("  1. Start backend: python -m uvicorn main:app --reload --port 8001")
        print("  2. Start frontend: cd ../frontend && npm run dev")
        print("  3. Visit: http://localhost:3000/rewards")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
