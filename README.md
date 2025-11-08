# 🏠 Housr - Bill Payment & Rewards Platform

A gamified bill payment system that rewards users with credits for paying bills on time. Redeem credits for gift cards and exclusive perks.

## ✨ Features

- 🔐 **Secure Authentication** - Supabase Auth integration
- 💳 **Bill Management** - Track and pay bills
- 🎁 **Rewards System** - Earn credits on every payment
- 🔥 **Streak Bonuses** - Higher rates for consistent payments
- 🏆 **Leaderboard** - Compete with other users
- 🛍️ **Redemption Catalog** - Gift cards, discounts, and perks

## 🛠️ Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui  
**Backend:** FastAPI (Python), Uvicorn  
**Database:** Supabase (PostgreSQL)  
**Auth:** Supabase Auth  

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd guhack2025

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

See **[SETUP.md](SETUP.md)** for detailed setup instructions.

**Quick setup:**
- Create `backend/.env` with Supabase credentials
- Create `frontend/.env.local` with Supabase credentials
- Get credentials from: https://app.supabase.com/project/_/settings/api

### 3. Run Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Open:** http://localhost:3000

## 📁 Project Structure

```
guhack2025/
├── backend/              # FastAPI backend
│   ├── main.py          # Application entry
│   ├── reward.py        # API routes
│   ├── db.py            # Database operations
│   └── .env             # Environment config (create this)
│
├── frontend/            # Next.js frontend
│   ├── app/            # Pages
│   │   ├── page.tsx           # Login
│   │   ├── signup/            # Sign up
│   │   ├── dashboard/         # User dashboard
│   │   ├── bills/             # Bill management
│   │   └── rewards/           # Rewards catalog
│   ├── components/     # React components
│   ├── lib/           # Utilities & API client
│   └── .env.local     # Environment config (create this)
│
├── README.md          # This file
└── SETUP.md          # Detailed setup guide
```

## 🎮 How It Works

1. **Sign Up** → Create account
2. **Add Bills** → Track bills with due dates
3. **Pay Bills** → Make payments through the app
4. **Earn Credits** → Get 1-5% back based on category
5. **Build Streaks** → Increase reward rate with consistent payments
6. **Redeem Rewards** → Spend credits on gift cards and perks

## 📊 Credit System

| Bill Category | Reward Rate |
|---------------|-------------|
| Rent | 5% |
| Utilities | 3% |
| Subscriptions | 2% |

**Streak Bonuses:** Pay on time consistently to unlock higher rates!

## 🔧 Utilities

```bash
# Check backend health
curl http://localhost:8001/api/health

# Verify environment setup
cd backend && python check_env.py

# Full system diagnostic
./diagnose.sh

# View API documentation
open http://localhost:8001/docs
```

## 🐛 Troubleshooting

### Backend won't start
- Check `backend/.env` exists with valid Supabase credentials
- Run: `cd backend && python check_env.py`

### Frontend shows "Cannot connect to backend"
- Ensure backend is running on port 8001
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8001`

### Credits not loading
- Restart backend: Stop (Ctrl+C) and run `python main.py` again
- Hard reload browser: Ctrl+Shift+R

**More help:** See [SETUP.md](SETUP.md) or run `./diagnose.sh`

## 📚 API Documentation

Once backend is running, visit http://localhost:8001/docs for interactive API documentation.

**Key Endpoints:**
- `POST /api/reward/users/init` - Initialize user
- `GET /api/reward/bills` - List bills
- `POST /api/reward/payments` - Record payment
- `GET /api/reward/rewards` - List rewards
- `POST /api/reward/redemptions` - Redeem reward

## 🗄️ Database

Using Supabase (PostgreSQL) with tables:
- `profiles` - User accounts & credits
- `bills` - Bills to pay
- `payments` - Payment transactions
- `rewards_ledger` - Credit earning details
- `streak_status` - Streak tracking
- `credit_shop` - Available rewards
- `redemptions` - Redemption history

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

**Need help?** Check [SETUP.md](SETUP.md) or run `./diagnose.sh`

**Made for GUHack2025** 🎓
