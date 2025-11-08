# 🚨 紧急修复清单 - 数据类型不匹配问题

## 发现的严重 Bug

### Bug #1: delete_user_by_email 函数类型错误 ❌
**位置**: `backend/db.py` Line 355, 381  
**问题**: 尝试用 UUID 删除 integer 类型的 user_id 记录

```python
# Line 355 - 会失败！credit_log.user_id 是 integer，但 uid 是 uuid
sb.table(T_CREDIT_LOG).delete().eq("user_id", uid).execute()

# Line 381 - 会失败！leaderboard.user_id 是 integer，但 uid 是 uuid  
sb.table(T_LEADERBOARD).delete().eq("user_id", uid).execute()
```

**影响**: 
- ❌ 删除用户时，credit_log 和 leaderboard 的记录不会被删除
- ❌ 会导致数据残留和外键引用问题

---

## 完整的类型不匹配总结

### 问题表格:

| 表名 | user_id 类型 (Schema) | profiles.id 类型 | 是否匹配 | 影响的函数 |
|------|---------------------|------------------|----------|-----------|
| profiles | uuid PK | - | ✅ | - |
| bills | uuid | uuid | ✅ | 所有 bills 操作 |
| payments | uuid | uuid | ✅ | 所有 payments 操作 |
| rewards | uuid FK | uuid | ✅ | 所有 rewards 操作 |
| redemptions | uuid | uuid | ✅ | 所有 redemptions 操作 |
| **credit_log** | **integer** ⚠️ | uuid | ❌ | `create_payment()`, `redeem_reward()`, `list_credit_logs()`, **`delete_user_by_email()`** |
| **leaderboard** | **integer PK** ⚠️ | uuid | ❌ | `init_user()`, **`delete_user_by_email()`**, `get_leaderboard()` |

---

## 代码中的 Workaround 分析

### 当前的临时解决方案:
```python
# Line 409, 552, 616, 746 等位置
user_id_int = int(user_id.replace('-', '')[:9], 16) % 2147483647
```

**这个方案的问题**:
1. ⚠️ UUID → int 转换不可逆（无法从 int 还原到 UUID）
2. ⚠️ 可能产生哈希碰撞（两个不同的 UUID 转成同一个 int）
3. ❌ **delete_user_by_email 函数忘记做转换，直接用 UUID 删除**

---

## 🔧 根本解决方案

### 选项 A: 修改数据库 Schema (推荐) ⭐
将 `credit_log` 和 `leaderboard` 的 `user_id` 改为 `uuid` 类型：

```sql
-- 1. 修复 credit_log 表
ALTER TABLE public.credit_log 
  DROP CONSTRAINT IF EXISTS credit_log_pkey;

ALTER TABLE public.credit_log 
  ALTER COLUMN user_id TYPE uuid USING NULL;  -- 先清空数据，因为转换不可逆

-- 或者如果要保留数据，需要先建立 UUID 映射表
ALTER TABLE public.credit_log
  ADD CONSTRAINT credit_log_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. 修复 leaderboard 表  
ALTER TABLE public.leaderboard 
  DROP CONSTRAINT IF EXISTS leaderboard_pkey;

ALTER TABLE public.leaderboard 
  ALTER COLUMN user_id TYPE uuid USING NULL;  -- 先清空数据

ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_pkey PRIMARY KEY (user_id);

ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

**修改后需要更新的代码**:
```python
# 移除所有 UUID → int 转换代码
# Line 409 - init_user()
sb.table(T_LEADERBOARD).insert({
    "user_id": user_id,  # 直接使用 uuid
    "total_credit_earned": 0,
    ...
})

# Line 552 - create_payment()
sb.table(T_CREDIT_LOG).insert({
    "user_id": user_id,  # 直接使用 uuid
    ...
})

# Line 616 - list_credit_logs()
res = sb.table(T_CREDIT_LOG).select("*").eq("user_id", user_id).order("log_id").execute()
# 不需要转换

# Line 746 - redeem_reward()
sb.table(T_CREDIT_LOG).insert({
    "user_id": user_id,  # 直接使用 uuid
    ...
})
```

---

### 选项 B: 完善当前的 Workaround (临时方案)

如果暂时无法修改数据库，需要修复 `delete_user_by_email` 函数：

```python
def delete_user_by_email(email: str) -> Dict[str, Any]:
    sb = get_client()
    prof_res = sb.table(T_USER).select("id, email").eq("email", email).execute()
    users = prof_res.data or []
    if not users:
        return {"status": "ok", "user_ids": [], "note": "no profiles matched"}

    deleted_ids = []
    for u in users:
        uid = u.get("id")
        if not uid:
            continue
        deleted_ids.append(uid)
        
        # ✅ 添加 UUID → int 转换
        user_id_int = int(uid.replace('-', '')[:9], 16) % 2147483647

        # ... other deletions ...

        # Delete credit logs - 使用转换后的 int
        try:
            sb.table(T_CREDIT_LOG).delete().eq("user_id", user_id_int).execute()  # ✅ 修复
        except Exception:
            pass
            
        # ... other deletions ...
        
        # Delete leaderboard rows - 使用转换后的 int
        try:
            sb.table(T_LEADERBOARD).delete().eq("user_id", user_id_int).execute()  # ✅ 修复
        except Exception:
            pass
```

---

## 📋 修复优先级

### P0 - 立即修复 (阻断性 Bug):
- [ ] **修复 delete_user_by_email 中的类型错误** (Line 355, 381)

### P1 - 高优先级 (数据一致性):
- [ ] 决定使用方案 A (修改 Schema) 还是方案 B (完善 Workaround)
- [ ] 如果选方案 A，执行 SQL 迁移并更新代码
- [ ] 如果选方案 B，在所有涉及的地方添加类型转换

### P2 - 中优先级 (功能完善):
- [ ] 实现 `rewards_ledger` 表或删除
- [ ] 实现 `streak_status` 表或删除
- [ ] 添加 `credit_shop.stock` 库存检查

---

## ✅ 推荐执行步骤

1. **立即修复 delete_user_by_email bug** (5分钟)
   - 添加 user_id_int 转换
   - 测试删除用户功能

2. **评估数据迁移风险** (30分钟)
   - 检查现有 credit_log 和 leaderboard 数据量
   - 评估是否可以清空重建

3. **执行 Schema 迁移** (如果数据量小，推荐) (1小时)
   - 备份数据库
   - 执行 ALTER TABLE 语句
   - 更新 Python 代码移除转换
   - 测试所有功能

4. **或者完善 Workaround** (如果数据重要，必须保留) (2小时)
   - 创建 UUID ↔ int 映射表
   - 更新所有相关代码
   - 添加单元测试

---

## 🧪 测试检查清单

修复后必须测试:
- [ ] 创建用户 → 检查 leaderboard 记录
- [ ] 支付账单 → 检查 credit_log 记录
- [ ] 兑换奖励 → 检查 credit_log 记录
- [ ] 删除用户 → 检查所有表的记录都被删除
- [ ] 查询积分日志 → 能正确返回数据
- [ ] 查询排行榜 → 能正确返回数据
