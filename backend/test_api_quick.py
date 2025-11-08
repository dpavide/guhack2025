"""Quick test to verify API is working."""
import requests

API_BASE = "http://localhost:8001"

print("Testing backend API...")

# Test 1: Health check
try:
    response = requests.get(f"{API_BASE}/")
    print(f"✅ Health check: {response.status_code}")
except Exception as e:
    print(f"❌ Health check failed: {e}")

# Test 2: List rewards
try:
    response = requests.get(f"{API_BASE}/api/reward/rewards")
    print(f"✅ Rewards endpoint: {response.status_code}")
    if response.status_code == 200:
        rewards = response.json()
        print(f"   Found {len(rewards)} rewards")
except Exception as e:
    print(f"❌ Rewards endpoint failed: {e}")

# Test 3: List users
try:
    response = requests.get(f"{API_BASE}/api/reward/users")
    print(f"✅ Users endpoint: {response.status_code}")
    if response.status_code == 200:
        users = response.json()
        print(f"   Found {len(users)} users")
        if len(users) > 0:
            print(f"   Sample user: {users[0]['UserName']} ({users[0]['Email']})")
except Exception as e:
    print(f"❌ Users endpoint failed: {e}")

print("\nAPI is ready at http://localhost:8001")
print("API docs at http://localhost:8001/docs")
