# 🔍 数据库字段完整对照检查报告

**检查时间**: 2025-11-08  
**检查方式**: 逐字段对照 Schema 定义

---

## 1️⃣ profiles 表

### Schema 定义:
```sql
id uuid NOT NULL (PK, FK to auth.users)
email text UNIQUE
full_name text
created_at timestamptz DEFAULT now()
username text UNIQUE
```

### 代码字段映射 (db.py line 93-102):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| UserID | `row.get("id")` | `id` | ✅ |
| UserName | `row.get("full_name")` | `full_name` | ✅ |
| Email | `row.get("email")` | `email` | ✅ |
| JoinedAt | `row.get("created_at")` | `created_at` | ✅ |

**未使用字段**: 
- ⚠️ `username` - Schema 有但代码使用 `full_name`

**结论**: ✅ 所有使用的字段完全匹配

---

## 2️⃣ bills 表

### Schema 定义:
```sql
id uuid NOT NULL DEFAULT gen_random_uuid() (PK)
user_id uuid
title text NOT NULL
amount numeric NOT NULL
due_date date NOT NULL
status text DEFAULT 'unpaid'
created_at timestamptz DEFAULT now()
description text
receiver_bank varchar
receiver_name varchar
category varchar
```

### 代码字段映射 (db.py line 106-136):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| BillID | `row.get("id")` | `id` | ✅ |
| UserID | `row.get("user_id")` | `user_id` | ✅ |
| Title | `row.get("title")` | `title` | ✅ |
| Amount | `row.get("amount")` | `amount` | ✅ |
| DueDate | `row.get("due_date")` | `due_date` | ✅ |
| Status | `row.get("status")` | `status` | ✅ |
| CreatedAt | `row.get("created_at")` | `created_at` | ✅ |
| Description | `row.get("description")` | `description` | ✅ |
| ReceiverBank | `row.get("receiver_bank")` | `receiver_bank` | ✅ |
| ReceiverName | `row.get("receiver_name")` | `receiver_name` | ✅ |
| Category | `row.get("category")` | `category` | ✅ |

**结论**: ✅ 完美匹配 (11/11 字段)

---

## 3️⃣ payments 表

### Schema 定义:
```sql
id uuid NOT NULL DEFAULT gen_random_uuid() (PK)
user_id uuid
bill_id uuid (FK to bills)
amount_paid numeric NOT NULL
status text DEFAULT 'success'
created_at timestamptz DEFAULT now()
payer_bank varchar
payer_name varchar
order_number varchar
payment_method varchar
payment_time timestamptz
remark text
```

### 代码字段映射 (db.py line 139-157):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| PaymentID | `row.get("id")` | `id` | ✅ |
| UserID | `row.get("user_id")` | `user_id` | ✅ |
| BillID | `row.get("bill_id")` | `bill_id` | ✅ |
| AmountPaid | `row.get("amount_paid")` | `amount_paid` | ✅ |
| PaymentStatus | `row.get("status")` | `status` | ✅ |
| PayerBank | `row.get("payer_bank")` | `payer_bank` | ✅ |
| PayerName | `row.get("payer_name")` | `payer_name` | ✅ |
| OrderNumber | `row.get("order_number")` | `order_number` | ✅ |
| PaymentMethod | `row.get("payment_method")` | `payment_method` | ✅ |
| PaymentTime | `row.get("payment_time")` | `payment_time` | ✅ |
| Remark | `row.get("remark")` | `remark` | ✅ |
| - | `row.get("created_at")` | `created_at` | ✅ (作为 payment_time 的备用值) |

**结论**: ✅ 完美匹配 (12/12 字段)

---

## 4️⃣ rewards 表

### Schema 定义:
```sql
id uuid NOT NULL DEFAULT gen_random_uuid() (PK)
user_id uuid (FK to profiles)
total_credits numeric DEFAULT 0
```

### 代码使用情况:
| 操作 | 字段使用 | 状态 |
|------|---------|------|
| 查询积分 | `total_credits` | ✅ |
| 创建记录 | `user_id, total_credits` | ✅ |
| 更新积分 | `total_credits` | ✅ |

**结论**: ✅ 完美匹配 (3/3 字段)

**注意**: ✅ 已移除不存在的 `created_at` 和 `last_updated` 引用

---

## 5️⃣ credit_shop 表

### Schema 定义:
```sql
shop_item_id integer NOT NULL (PK, 序列自增)
item_name varchar NOT NULL
item_description text
credit_cost integer NOT NULL
stock integer DEFAULT 0
status varchar DEFAULT 'active'
created_at timestamptz DEFAULT now()
```

### 代码字段映射 (db.py line 176-188):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| RewardID | `str(row.get("shop_item_id"))` | `shop_item_id` | ✅ (转为字符串) |
| Type | `row.get("item_name")` | `item_name` | ✅ |
| Description | `row.get("item_description")` | `item_description` | ✅ |
| CreditCost | `row.get("credit_cost")` | `credit_cost` | ✅ |
| Active | `status == "active"` | `status` | ✅ |

**未使用字段**:
- ⚠️ `stock` - 没有库存检查逻辑
- ⚠️ `created_at` - 未在 API 中返回

**额外字段**:
- ⚠️ `Icon: None` - Schema 中不存在此字段

**结论**: ⚠️ 5/7 字段匹配，2个未使用，1个不存在

---

## 6️⃣ redemptions 表

### Schema 定义:
```sql
id uuid NOT NULL DEFAULT gen_random_uuid() (PK)
user_id uuid
reward_id uuid
redemption_type text
amount numeric
description text
created_at timestamptz DEFAULT now()
```

### 代码字段映射 (db.py line 191-206):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| RedemptionID | `row.get("id")` | `id` | ✅ |
| UserID | `row.get("user_id")` | `user_id` | ✅ |
| RewardID | `row.get("reward_id")` | `reward_id` | ✅ |
| RedemptionType | `row.get("redemption_type")` | `redemption_type` | ✅ |
| Amount | `row.get("amount")` | `amount` | ✅ |
| Description | `row.get("description")` | `description` | ✅ |
| RedemptionDate | `row.get("created_at")` | `created_at` | ✅ |

**结论**: ✅ 完美匹配 (7/7 字段)

---

## 7️⃣ credit_log 表

### Schema 定义:
```sql
log_id integer NOT NULL (PK, 序列自增)
user_id integer NOT NULL  ⚠️ 类型不匹配
source_type varchar NOT NULL
source_id integer
change_amount integer NOT NULL
balance_after integer NOT NULL
created_at timestamptz DEFAULT now()
```

### 代码字段映射 (db.py line 161-173):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| LogID | `row.get("log_id")` | `log_id` | ✅ |
| UserID | `row.get("user_id")` | `user_id` | ⚠️ 类型不匹配 (int vs uuid) |
| SourceType | `row.get("source_type")` | `source_type` | ✅ |
| SourceID | `row.get("source_id")` | `source_id` | ✅ |
| ChangeAmount | `row.get("change_amount")` | `change_amount` | ✅ |
| BalanceAfter | `row.get("balance_after")` | `balance_after` | ✅ |
| Timestamp | `row.get("created_at")` | `created_at` | ✅ |

**类型问题**:
- ❌ `user_id` Schema 定义为 `integer`
- ❌ 实际 profiles.id 是 `uuid`
- ✅ 代码已添加 UUID → int 转换 workaround

**结论**: ⚠️ 7/7 字段匹配，但有类型不一致

---

## 8️⃣ leaderboard 表

### Schema 定义:
```sql
user_id integer NOT NULL (PK)  ⚠️ 类型不匹配
total_credit_earned integer DEFAULT 0
total_redeemed integer DEFAULT 0
last_updated timestamptz DEFAULT now()
```

### 代码字段映射 (db.py line 208-217):
| API 字段 | 代码 | Schema 字段 | 状态 |
|---------|------|------------|------|
| UserID | `row.get("user_id")` | `user_id` | ⚠️ 类型不匹配 (int vs uuid) |
| TotalCreditEarned | `row.get("total_credit_earned")` | `total_credit_earned` | ✅ |
| TotalRedeemed | `row.get("total_redeemed")` | `total_redeemed` | ✅ |
| LastUpdated | `row.get("last_updated")` | `last_updated` | ✅ |

**类型问题**:
- ❌ `user_id` Schema 定义为 `integer PK`
- ❌ 实际 profiles.id 是 `uuid`
- ✅ 代码已添加 UUID → int 转换 workaround

**结论**: ⚠️ 4/4 字段匹配，但有类型不一致

---

## 9️⃣ rewards_ledger 表 ❌ (未使用)

### Schema 定义:
```sql
id bigint NOT NULL (PK, 序列自增)
user_id uuid NOT NULL (FK to auth.users)
payment_id uuid NOT NULL
base_amount numeric NOT NULL
applied_rate numeric NOT NULL
credit_earned numeric (计算字段)
created_at timestamptz NOT NULL DEFAULT now()
```

### 代码使用情况:
- ❌ 完全未在代码中引用
- ❌ 没有任何 CRUD 操作

**结论**: ❌ 表存在但未使用

---

## 🔟 streak_status 表 ❌ (未使用)

### Schema 定义:
```sql
user_id uuid NOT NULL (PK, FK to auth.users)
current_streak integer NOT NULL DEFAULT 0
longest_streak integer NOT NULL DEFAULT 0
last_payment_at timestamptz
next_due_by timestamptz
current_rate numeric NOT NULL DEFAULT 0.01
updated_at timestamptz NOT NULL DEFAULT now()
```

### 代码使用情况:
- ❌ 完全未在代码中引用
- ❌ 没有连续支付奖励功能

**结论**: ❌ 表存在但未使用

---

## 📊 总体统计

### 字段匹配度:

| 表名 | Schema 字段数 | 使用字段数 | 匹配度 | 状态 |
|------|-------------|----------|--------|------|
| profiles | 5 | 4 | 80% | ✅ |
| bills | 11 | 11 | 100% | ✅ |
| payments | 12 | 12 | 100% | ✅ |
| rewards | 3 | 3 | 100% | ✅ |
| credit_shop | 7 | 5 | 71% | ⚠️ |
| redemptions | 7 | 7 | 100% | ✅ |
| credit_log | 7 | 7 | 100%* | ⚠️ (类型不匹配) |
| leaderboard | 4 | 4 | 100%* | ⚠️ (类型不匹配) |
| rewards_ledger | 7 | 0 | 0% | ❌ |
| streak_status | 7 | 0 | 0% | ❌ |

**总计**: 70 个字段，53 个正确使用，匹配度 **75.7%**

---

## 🚨 发现的问题

### P0 - 严重问题:

1. **credit_log.user_id 类型不匹配**
   - Schema: `integer NOT NULL`
   - 应该: `uuid` (FK to profiles)
   - 影响: 需要哈希转换，可能碰撞

2. **leaderboard.user_id 类型不匹配**
   - Schema: `integer NOT NULL` (PK)
   - 应该: `uuid` (FK to profiles)
   - 影响: 需要哈希转换，可能碰撞

### P1 - 中等问题:

3. **rewards_ledger 表完全未使用**
   - 7 个字段全部未引用
   - 建议: 实现功能或删除表

4. **streak_status 表完全未使用**
   - 7 个字段全部未引用
   - 建议: 实现连续支付奖励或删除表

### P2 - 轻微问题:

5. **profiles.username 未使用**
   - 代码使用 `full_name` 而非 `username`

6. **credit_shop.stock 未使用**
   - 缺少库存检查逻辑

7. **credit_shop.created_at 未使用**
   - 未在 API 中返回

8. **API 返回不存在的字段**
   - `Icon: None` - Schema 中无此字段

---

## ✅ 修复建议

### 立即执行:

**修改数据库 Schema (推荐)**:
```sql
-- 1. 修复 credit_log
ALTER TABLE public.credit_log 
  ALTER COLUMN user_id TYPE uuid USING NULL;
  
ALTER TABLE public.credit_log
  ADD CONSTRAINT credit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. 修复 leaderboard
ALTER TABLE public.leaderboard 
  ALTER COLUMN user_id TYPE uuid USING NULL;
  
ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### 可选优化:

1. **删除未使用的表**:
```sql
DROP TABLE IF EXISTS public.rewards_ledger;
DROP TABLE IF EXISTS public.streak_status;
```

2. **或实现缺失功能**:
   - 实现 rewards_ledger 详细积分记录
   - 实现 streak_status 连续支付奖励

---

## 📝 总结

✅ **匹配良好的表** (6个): profiles, bills, payments, rewards, redemptions  
⚠️ **需要优化的表** (2个): credit_shop (库存管理), credit_log (类型修复)  
❌ **需要处理的表** (4个): leaderboard (类型修复), rewards_ledger (未使用), streak_status (未使用)

**整体评分**: 7.5/10

字段映射基本正确，主要问题是类型不匹配和未使用的表。
