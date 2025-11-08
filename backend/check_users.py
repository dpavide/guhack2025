"""Check user data in database."""
import sys
sys.path.insert(0, '.')

import db

users = db.list_users()
print(f"\n Found {len(users)} users in database:\n")

for i, u in enumerate(users[:10], 1):
    full_name = u['UserName']
    email = u['Email']
    credits = u['CurrentCredit']
    
    # Highlight users without full_name
    if not full_name or full_name == 'None':
        print(f"  {i}. ❌ No name ({email}) - {credits} credits")
    else:
        print(f"  {i}. ✅ {full_name} ({email}) - {credits} credits")

print(f"\n💡 如果用户名显示为 None 或空，请在数据库中更新 profiles.full_name 字段")
