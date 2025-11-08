# 🚀 Setup Guide

## Prerequisites

- Python 3.8+
- Node.js 18+
- Supabase account (free tier works)

---

## 1. Get Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Settings → API**
4. Copy:
   - **Project URL** 
   - **anon/public key**

---

## 2. Configure Backend

Create `backend/.env`:

```bash
cd backend
nano .env
```

Add your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verify:**
```bash
python check_env.py
```

Should show: ✅ All required environment variables are set!

---

## 3. Configure Frontend

Create `frontend/.env.local`:

```bash
cd frontend
nano .env.local
```

Add your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## 4. Install Dependencies

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

## 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python main.py
```

Wait for: `INFO: Uvicorn running on http://0.0.0.0:8001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for: `✓ Ready in 2.5s`

---

## 6. Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

---

## 🔧 Troubleshooting

### "Cannot connect to backend"

**Cause:** Backend not running

**Fix:**
```bash
cd backend
source venv/bin/activate
python main.py
```

---

### "Missing Supabase configuration"

**Cause:** Missing or incorrect `.env` file

**Fix:**
1. Check `backend/.env` exists with valid credentials
2. Run `cd backend && python check_env.py` to verify
3. Restart backend after creating/editing `.env`

---

### Credits showing 0 when database has credits

**Cause:** Backend server not restarted after code changes

**Fix:**
1. Stop backend (Ctrl+C)
2. Restart: `python main.py`
3. Hard reload browser (Ctrl+Shift+R)

---

### "Load failed" error in browser

**Cause:** Frontend needs restart or browser cache

**Fix:**
1. Stop frontend (Ctrl+C)
2. Clear cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Hard reload browser (Ctrl+Shift+R)

---

## 🧪 Quick Diagnostics

**Check backend:**
```bash
curl http://localhost:8001/api/health
# Should return: {"status":"healthy"}
```

**Check environment:**
```bash
cd backend && python check_env.py
```

**Run full diagnostic:**
```bash
./diagnose.sh
```

---

## 📋 Common Commands

```bash
# Check if backend is running
curl http://localhost:8001/api/health

# Check backend environment
cd backend && python check_env.py

# Restart backend
cd backend && source venv/bin/activate && python main.py

# Restart frontend
cd frontend && npm run dev

# View API documentation
open http://localhost:8001/docs
```

---

## 🔐 Security Notes

- Never commit `.env` or `.env.local` files
- They are already in `.gitignore`
- Use anon/public key for both frontend and backend
- Service role key only needed for admin operations

---

## ✅ Success Checklist

- [ ] `backend/.env` created with Supabase credentials
- [ ] `frontend/.env.local` created with Supabase credentials  
- [ ] Backend running on port 8001
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can sign up / log in
- [ ] Rewards page loads without errors
- [ ] Credits display correctly

---

**Need more help?** See the full README.md or run `./diagnose.sh`
