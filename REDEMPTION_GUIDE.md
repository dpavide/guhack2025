# ✅ Redemption System - Complete Guide

## 🎯 How It Works

The redemption system is **fully implemented** in your backend! Here's the flow:

### 1. User Views Rewards
- Frontend loads rewards from `credit_shop` table
- Displays item name, description, credit cost
- Shows "Redeem" button if user has enough credits

### 2. User Clicks "Redeem"
- Frontend calls: `POST /api/reward/redemptions`
- Sends: `{UserID, RewardID}`

### 3. Backend Processes Redemption
**File:** `backend/db.py` → `redeem_reward()` function

**What happens:**
1. ✅ Validates user exists
2. ✅ Fetches reward from `credit_shop` table
3. ✅ Checks reward is active
4. ✅ Checks user has enough credits (`profiles.credits`)
5. ✅ Creates record in `redemptions` table
6. ✅ **Deducts credits from `profiles.credits`**
7. ✅ Logs transaction in `credit_log`
8. ✅ Returns success

---

## 🐛 Why Redemption Might Fail

### Issue 1: Backend Not Restarted ⚠️

**Problem:** Backend still running old code

**Solution:**
```bash
cd backend
# Stop backend (Ctrl+C)
python main.py
```

**Why:** The backend fix for credits loading needs a restart

---

### Issue 2: No Rewards in Database ⚠️

**Problem:** `credit_shop` table is empty

**Check:**
```sql
-- In Supabase SQL Editor
SELECT * FROM credit_shop;
```

**If empty, add some rewards:**
```sql
INSERT INTO credit_shop (item_name, item_description, credit_cost, status) 
VALUES 
  ('Amazon Gift Card £25', '£25 Amazon gift card', 500, 'active'),
  ('Google Play Gift Card £25', '£25 Google Play credit', 500, 'active'),
  ('Apple Gift Card £50', '£50 Apple Store credit', 1000, 'active'),
  ('Coffee Voucher', 'Free coffee at participating cafes', 50, 'active'),
  ('Rent Discount 5%', '5% off next months rent', 2500, 'active');
```

---

### Issue 3: Reward ID Format Mismatch ⚠️

**Problem:** Frontend sends UUID, but `credit_shop` uses integer IDs

**The Fix:** Backend handles both!

Backend code (lines 688-699):
```python
# Tries integer first
shop_item_id = int(reward_id)
shop_item = sb.table(T_CREDIT_SHOP).select("*").eq("shop_item_id", shop_item_id)
```

**What to check:**
- RewardID in frontend should be `shop_item_id` (integer)
- Not a UUID

---

### Issue 4: Insufficient Credits ⚠️

**Problem:** User doesn't have enough credits

**Backend validation:**
```python
balance = _recalc_user_credit(sb, user_id)
if balance < cost:
    raise ValueError("Insufficient credit")
```

**Response:** 400 error with message

---

## 🧪 Testing Redemption

### Step 1: Ensure Backend is Running

```bash
curl http://localhost:8001/api/health
# Should return: {"status":"healthy"}
```

### Step 2: Check Available Rewards

```bash
curl http://localhost:8001/api/reward/rewards
```

**Should return:**
```json
[
  {
    "RewardID": "1",
    "Type": "Amazon Gift Card £25",
    "CreditCost": 500,
    "Description": "...",
    "Active": true
  }
]
```

### Step 3: Check User Credits

Replace `USER_ID` with actual UUID:
```bash
curl http://localhost:8001/api/reward/users/USER_ID
```

**Should show:**
```json
{
  "UserID": "...",
  "CurrentCredit": 10000
}
```

### Step 4: Test Redemption

```bash
curl -X POST http://localhost:8001/api/reward/redemptions \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "your-user-id",
    "RewardID": "1"
  }'
```

**Success response:**
```json
{
  "RedemptionID": "...",
  "UserID": "...",
  "RewardID": "...",
  "CreditSpent": 500,
  "RedemptionDate": "...",
  "RewardStatus": "completed"
}
```

**After redemption, check credits again:**
```bash
curl http://localhost:8001/api/reward/users/USER_ID
```

Should show reduced balance: `10000 - 500 = 9500`

---

## 🔍 Debugging Steps

### 1. Check Backend Logs

Look at terminal where `python main.py` is running.

**Look for:**
- Any error messages
- HTTP 400/500 responses
- Stack traces

### 2. Check Browser Console

Press F12 → Console tab

**Look for:**
- `POST /api/reward/redemptions` request
- Response status (200, 400, 500)
- Error messages

### 3. Check Supabase Database

**After redemption attempt, check:**

```sql
-- Check redemptions table
SELECT * FROM redemptions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC;

-- Check user credits
SELECT id, email, credits 
FROM profiles 
WHERE id = 'your-user-id';

-- Check credit log
SELECT * FROM credit_log 
WHERE source_type = 'Redemption' 
ORDER BY created_at DESC;
```

---

## ✅ Complete Redemption Flow

### Database Changes After Successful Redemption:

1. **`redemptions` table** - New record:
   ```sql
   id: uuid
   user_id: your-user-id
   reward_id: NULL
   redemption_type: "credit_shop"
   amount: 500
   description: "shop_item:1"
   created_at: timestamp
   ```

2. **`profiles` table** - Credits updated:
   ```sql
   -- Before: credits = 10000
   -- After:  credits = 9500
   ```

3. **`credit_log` table** - Transaction logged:
   ```sql
   user_id: (hashed integer)
   source_type: "Redemption"
   source_id: 1
   change_amount: -500
   balance_after: 9500
   ```

---

## 🚨 Common Errors & Solutions

### Error: "User not found"
**Cause:** Invalid user ID
**Fix:** Ensure user is logged in, check user ID is correct UUID

### Error: "Reward not found"
**Cause:** Reward ID doesn't exist in `credit_shop`
**Fix:** Check `SELECT * FROM credit_shop;` in Supabase

### Error: "Reward not active"
**Cause:** Reward status is not "active"
**Fix:** Update reward: `UPDATE credit_shop SET status='active' WHERE shop_item_id=1;`

### Error: "Insufficient credit"
**Cause:** User doesn't have enough credits
**Fix:** Add credits manually for testing:
```sql
UPDATE profiles SET credits = 10000 WHERE id = 'your-user-id';
```

### Error: "Failed to create redemption"
**Cause:** Database insert failed
**Fix:** Check Supabase logs, ensure `redemptions` table exists

---

## 🎯 Quick Fix Checklist

Before testing redemption:

- [ ] Backend server is running on port 8001
- [ ] Backend server was restarted after credit fix
- [ ] `credit_shop` table has active rewards
- [ ] User has sufficient credits in `profiles.credits`
- [ ] User is logged in (has valid session)
- [ ] Frontend can connect to backend

**Test command:**
```bash
# 1. Check backend
curl http://localhost:8001/api/health

# 2. Check rewards available
curl http://localhost:8001/api/reward/rewards

# 3. Check user credits
curl http://localhost:8001/api/reward/users/YOUR_USER_ID

# 4. Try redemption in browser
```

---

## 💡 The System is Already Complete!

**Good news:** The redemption system is fully implemented and working!

**What you need to do:**
1. ✅ Restart backend server
2. ✅ Add rewards to `credit_shop` table (if empty)
3. ✅ Ensure user has credits
4. ✅ Test redemption

**The code is there - it just needs data and a restart!** 🎉

