#!/bin/bash
# Diagnostic script for GUHack2025 connection issues

echo "🔍 GUHack2025 System Diagnostics"
echo "================================"
echo ""

# Check backend
echo "1️⃣ Checking Backend (port 8001)..."
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend is RUNNING"
    response=$(curl -s http://localhost:8001/api/health)
    echo "   Response: $response"
else
    echo "   ❌ Backend is NOT RUNNING"
    echo "   → Start with: cd backend && source venv/bin/activate && python main.py"
fi
echo ""

# Check frontend
echo "2️⃣ Checking Frontend (port 3000)..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is RUNNING"
else
    echo "   ❌ Frontend is NOT RUNNING"
    echo "   → Start with: cd frontend && npm run dev"
fi
echo ""

# Check backend environment
echo "3️⃣ Checking Backend Environment..."
if [ -f "backend/.env" ]; then
    echo "   ✅ backend/.env exists"
    cd backend
    if python check_env.py > /dev/null 2>&1; then
        echo "   ✅ Environment variables configured"
    else
        echo "   ⚠️  Environment variables may be missing"
        python check_env.py
    fi
    cd ..
else
    echo "   ❌ backend/.env NOT FOUND"
    echo "   → Create it with your Supabase credentials"
fi
echo ""

# Check frontend environment
echo "4️⃣ Checking Frontend Environment..."
if [ -f "frontend/.env.local" ]; then
    echo "   ✅ frontend/.env.local exists"
    if grep -q "NEXT_PUBLIC_API_URL" frontend/.env.local; then
        api_url=$(grep "NEXT_PUBLIC_API_URL" frontend/.env.local | cut -d '=' -f2)
        echo "   API URL: $api_url"
        if [ "$api_url" = "http://localhost:8001" ]; then
            echo "   ✅ API URL is correct"
        else
            echo "   ⚠️  API URL should be http://localhost:8001"
        fi
    else
        echo "   ⚠️  NEXT_PUBLIC_API_URL not found"
        echo "   → Add: NEXT_PUBLIC_API_URL=http://localhost:8001"
    fi
else
    echo "   ❌ frontend/.env.local NOT FOUND"
    echo "   → Create it with your Supabase credentials"
fi
echo ""

# Summary
echo "================================"
echo "📊 Summary"
echo "================================"
backend_running=$(curl -s http://localhost:8001/api/health > /dev/null 2>&1 && echo "yes" || echo "no")
frontend_running=$(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "yes" || echo "no")

if [ "$backend_running" = "yes" ] && [ "$frontend_running" = "yes" ]; then
    echo "✅ Both servers are running!"
    echo ""
    echo "If you still see connection errors:"
    echo "  1. Restart frontend: Ctrl+C then 'npm run dev'"
    echo "  2. Clear browser cache: Ctrl+Shift+R"
    echo "  3. Try incognito/private window"
    echo ""
    echo "Access your app at: http://localhost:3000"
elif [ "$backend_running" = "yes" ]; then
    echo "⚠️  Backend is running but frontend is not"
    echo "   → Start frontend: cd frontend && npm run dev"
elif [ "$frontend_running" = "yes" ]; then
    echo "⚠️  Frontend is running but backend is not"
    echo "   → Start backend: cd backend && source venv/bin/activate && python main.py"
else
    echo "❌ Neither server is running"
    echo ""
    echo "To start both servers:"
    echo "  Terminal 1: cd backend && source venv/bin/activate && python main.py"
    echo "  Terminal 2: cd frontend && npm run dev"
fi
echo ""
echo "For detailed help, see: FRONTEND_CONNECTION_FIX.md"

