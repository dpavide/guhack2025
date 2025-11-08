#!/usr/bin/env python3
"""
Quick environment check script for GUHack2025 backend.
Run this to verify your .env configuration before starting the server.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

load_dotenv(str(ROOT / ".env"))
load_dotenv(str(HERE / ".env"))

def check_env():
    """Check if required environment variables are set."""
    print("🔍 Checking environment configuration...\n")
    
    # Check for Supabase URL
    supabase_url = (
        os.getenv("SUPABASE_URL")
        or os.getenv("SUPABASE_PROJECT_URL")
        or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    )
    
    # Check for Supabase Key
    supabase_key = (
        os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )
    
    all_good = True
    
    # Check Supabase URL
    if supabase_url:
        print("✅ SUPABASE_URL: Found")
        # Mask the URL for security
        masked = supabase_url[:20] + "..." if len(supabase_url) > 20 else supabase_url
        print(f"   → {masked}")
    else:
        print("❌ SUPABASE_URL: Not found")
        print("   → Add SUPABASE_URL to your .env file")
        all_good = False
    
    print()
    
    # Check Supabase Key
    if supabase_key:
        print("✅ SUPABASE_KEY: Found")
        # Mask the key for security
        masked = supabase_key[:10] + "..." + supabase_key[-10:] if len(supabase_key) > 20 else "***"
        print(f"   → {masked}")
    else:
        print("❌ SUPABASE_KEY: Not found")
        print("   → Add SUPABASE_KEY to your .env file")
        all_good = False
    
    print("\n" + "="*50)
    
    if all_good:
        print("✅ All required environment variables are set!")
        print("   You can now run: python main.py")
        return 0
    else:
        print("❌ Missing required environment variables!")
        print("\n📝 To fix this:")
        print("   1. Create a .env file in the backend/ directory")
        print("   2. Add these lines:")
        print("      SUPABASE_URL=your_supabase_url")
        print("      SUPABASE_KEY=your_supabase_anon_key")
        print("\n   Get credentials from: https://app.supabase.com/project/_/settings/api")
        print("   See SETUP.md for detailed instructions")
        return 1

if __name__ == "__main__":
    sys.exit(check_env())

