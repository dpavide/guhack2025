# 数据库 Schema 完整审查报告
**日期**: 2025-11-08  
**审查范围**: Backend + Frontend 与数据库 Schema 对照

---

## 📊 数据库 Schema 概览

### ✅ 已使用的表 (7个)
1. **profiles** - 用户配置文件
2. **bills** - 账单
3. **payments** - 支付记录
4. **rewards** - 用户积分余额
5. **credit_shop** - 积分商城商品
6. **redemptions** - 兑换记录
7. **credit_log** - 积分变动日志
8. **leaderboard** - 排行榜

### ⚠️ 未使用的表 (2个)
1. **rewards_ledger** - 奖励账本（未在代码中引用）
2. **streak_status** - 连续支付状态（未在代码中引用）

---

## 🔍 详细字段对照检查

### 1. profiles 表 ✅
**Schema**: 
```sql
id uuid PK (FK to auth.users)
email text UNIQUE
full_name text
created_at timestamptz
username text UNIQUE
```

**代码映射** (db.py line 93-102):
```python
"UserID": row.get("id")           ✅
"UserName": row.get("full_name")  ✅
"Email": row.get("email")         ✅
"JoinedAt": row.get("created_at") ✅
```

**问题**:
- ⚠️ Schema 中有 `username` 字段，但代码未使用
- ✅ 使用 `full_name` 作为用户名是正确的

---

### 2. bills 表 ✅
**Schema**:
```sql
id uuid PK
user_id uuid
title text NOT NULL
amount numeric NOT NULL
due_date date NOT NULL
status text DEFAULT 'unpaid'
created_at timestamptz
description text
receiver_bank varchar
receiver_name varchar
category varchar
```

**代码映射** (db.py line 107-132):
```python
"BillID": row.get("id")                    ✅
"UserID": row.get("user_id")               ✅
"Title": row.get("title")                  ✅
"Amount": float(row.get("amount"))         ✅
"DueDate": row.get("due_date")             ✅
"Status": row.get("status")                ✅
"CreatedAt": row.get("created_at")         ✅
"Description": row.get("description")      ✅
"ReceiverBank": row.get("receiver_bank")   ✅
"ReceiverName": row.get("receiver_name")   ✅
"Category": row.get("category")            ✅
```

**状态**: ✅ 完美匹配

---

### 3. payments 表 ✅
**Schema**:
```sql
id uuid PK
user_id uuid
bill_id uuid (FK to bills)
amount_paid numeric NOT NULL
status text DEFAULT 'success'
created_at timestamptz
payer_bank varchar
payer_name varchar
order_number varchar
payment_method varchar
payment_time timestamptz
remark text
```

**代码映射** (db.py line 137-156):
```python
"PaymentID": row.get("id")                              ✅
"BillID": row.get("bill_id")                            ✅
"UserID": row.get("user_id")                            ✅
"AmountPaid": float(row.get("amount_paid"))             ✅
"PaymentStatus": row.get("status")                      ✅
"PayerBank": row.get("payer_bank")                      ✅
"PayerName": row.get("payer_name")                      ✅
"OrderNumber": row.get("order_number")                  ✅
"PaymentMethod": row.get("payment_method")              ✅
"PaymentTime": row.get("payment_time") or created_at    ✅
"Remark": row.get("remark")                             ✅
```

**状态**: ✅ 完美匹配

---

### 4. rewards 表 ✅
**Schema**:
```sql
id uuid PK
user_id uuid (FK to profiles)
total_credits numeric DEFAULT 0
```

**代码使用**:
- ✅ Line 260-267: 创建用户时初始化 rewards 记录
- ✅ Line 479-486: `_recalc_user_credit()` 计算用户积分
- ✅ Line 529-548: `create_payment()` 更新积分
- ✅ Line 729-732: `redeem_reward()` 扣减积分

**状态**: ✅ 正确，已移除不存在的 `created_at` 和 `last_updated` 字段

---

### 5. credit_shop 表 ✅
**Schema**:
```sql
shop_item_id integer PK (序列自增)
item_name varchar NOT NULL
item_description text
credit_cost integer NOT NULL
stock integer DEFAULT 0
status varchar DEFAULT 'active'
created_at timestamptz
```

**代码映射** (db.py line 174-186):
```python
"RewardID": str(row.get("shop_item_id"))  ✅ (转为字符串)
"Type": row.get("item_name")              ✅
"Description": row.get("item_description") ✅
"CreditCost": int(row.get("credit_cost")) ✅
"Active": status == "active"               ✅
"Icon": None                               ⚠️ (Schema 中无此字段)
```

**问题**:
- ⚠️ 代码返回 `Icon: None`，但 Schema 中没有 icon 字段
- ⚠️ 未使用 `stock` 字段（库存管理缺失）

---

### 6. redemptions 表 ✅
**Schema**:
```sql
id uuid PK
user_id uuid
reward_id uuid
redemption_type text
amount numeric
description text
created_at timestamptz
```

**代码映射** (db.py line 191-206):
```python
"RedemptionID": row.get("id")                ✅
"UserID": row.get("user_id")                 ✅
"RewardID": row.get("reward_id")             ✅
"RedemptionType": row.get("redemption_type") ✅
"Amount": int(row.get("amount"))             ✅
"CreditSpent": int(row.get("amount"))        ✅
"RedemptionDate": row.get("created_at")      ✅
"Description": row.get("description")        ✅
```

**状态**: ✅ 完美匹配

---

### 7. credit_log 表 ⚠️
**Schema**:
```sql
log_id integer PK (序列自增)
user_id integer NOT NULL  ⚠️ 注意：是 integer，不是 uuid
source_type varchar NOT NULL
source_id integer
change_amount integer NOT NULL
balance_after integer NOT NULL
created_at timestamptz
```

**类型不匹配问题**:
- ❌ Schema: `user_id integer`
- ❌ 实际: profiles.id 是 `uuid`
- ✅ 代码已处理：Line 552, 616 使用 UUID → int 转换

**代码处理** (db.py line 615-616):
```python
user_id_int = int(user_id.replace('-', '')[:9], 16) % 2147483647
```

**建议**: 
- 🔧 数据库应修改为 `user_id uuid` 以保持一致性
- 或者添加 FK 约束: `FOREIGN KEY (user_id) REFERENCES profiles(id)`

---

### 8. leaderboard 表 ⚠️
**Schema**:
```sql
user_id integer PK  ⚠️ 注意：是 integer，不是 uuid
total_credit_earned integer DEFAULT 0
total_redeemed integer DEFAULT 0
last_updated timestamptz
```

**类型不匹配问题**:
- ❌ Schema: `user_id integer PK`
- ❌ 实际: profiles.id 是 `uuid`
- ✅ 代码已处理：Line 409 使用 UUID → int 转换

**建议**: 
- 🔧 数据库应修改为 `user_id uuid` 以保持一致性

---

### 9. rewards_ledger 表 ❌ (未使用)
**Schema**:
```sql
id bigint PK
user_id uuid (FK to auth.users)
payment_id uuid
base_amount numeric
applied_rate numeric
credit_earned numeric (计算字段)
created_at timestamptz
```

**状态**: 
- ❌ 代码中完全未引用此表
- ❌ 没有相关的查询、插入、更新操作

**建议**:
- 如果需要详细的积分计算记录，应该使用此表
- 或者删除此表以简化 schema

---

### 10. streak_status 表 ❌ (未使用)
**Schema**:
```sql
user_id uuid PK (FK to auth.users)
current_streak integer DEFAULT 0
longest_streak integer DEFAULT 0
last_payment_at timestamptz
next_due_by timestamptz
current_rate numeric DEFAULT 0.01
updated_at timestamptz
```

**状态**: 
- ❌ 代码中完全未引用此表
- ❌ 没有连续支付奖励功能

**建议**:
- 如果要实现连续支付奖励机制，需要在代码中添加相关逻辑
- 或者删除此表

---

## 📱 前端页面检查

### 现有页面路由:
1. ✅ `/` - 首页 (page.tsx)
2. ✅ `/login` - 登录页
3. ✅ `/signup` - 注册页
4. ✅ `/dashboard` - 仪表盘
5. ✅ `/bills` - 账单页面
6. ✅ `/rewards` - 积分商城页面
7. ⚠️ `/redeem` - 兑换页面（可能与 rewards 重复？）

### 路由命名检查:
- ✅ 所有路由使用小写单词
- ✅ 命名清晰，符合 REST 约定
- ⚠️ `/redeem` 和 `/rewards` 功能可能重叠

---

## 🚨 关键问题总结

### 严重问题 (必须修复):
1. ❌ **credit_log.user_id 类型不匹配** 
   - Schema: `integer`
   - 应该是: `uuid` (FK to profiles)
   
2. ❌ **leaderboard.user_id 类型不匹配**
   - Schema: `integer PK`
   - 应该是: `uuid` (FK to profiles)

### 中等问题 (建议修复):
3. ⚠️ **未使用的表**
   - `rewards_ledger` - 完全未实现
   - `streak_status` - 完全未实现
   
4. ⚠️ **缺失的字段使用**
   - `profiles.username` - Schema 有但未使用
   - `credit_shop.stock` - 库存管理未实现

### 轻微问题:
5. ℹ️ **前端路由**
   - `/redeem` 页面可能与 `/rewards` 功能重复
   
6. ℹ️ **API 字段**
   - 返回 `Icon: None` 但 Schema 无此字段

---

## 💡 修复建议

### 立即执行 (修复数据库):
```sql
-- 1. 修复 credit_log 表
ALTER TABLE public.credit_log 
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

ALTER TABLE public.credit_log
  ADD CONSTRAINT credit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

-- 2. 修复 leaderboard 表
ALTER TABLE public.leaderboard 
  ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
```

### 代码修改 (修复后移除转换逻辑):
```python
# db.py - 移除 UUID → int 转换
# Line 409, 552, 616 等位置
# 改为直接使用 uuid:
sb.table(T_CREDIT_LOG).insert({
    "user_id": user_id,  # 直接使用 uuid，不需要转换
    ...
})
```

### 可选优化:
1. 实现 `rewards_ledger` 表的详细记录功能
2. 实现 `streak_status` 连续支付奖励
3. 添加 `credit_shop.stock` 库存检查
4. 合并 `/redeem` 和 `/rewards` 页面

---

## ✅ 总体评分

| 类别 | 评分 | 说明 |
|------|------|------|
| Schema 设计 | 7/10 | 有2个未使用的表，2个类型不匹配 |
| 代码实现 | 8/10 | 已实现类型转换workaround，但应修复源头 |
| 字段映射 | 9/10 | 大部分字段正确映射，仅少数字段未使用 |
| 前端路由 | 8/10 | 命名合理，但有轻微重复 |

**总分: 8/10** - 核心功能正常，但需要修复类型不匹配问题以提高稳定性。
