#!/bin/bash
# Quick script to check if backend is running

echo "🔍 Checking if backend is running..."
echo ""

# Check if backend is responding
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is RUNNING on port 8001"
    echo ""
    
    # Get health status
    response=$(curl -s http://localhost:8001/api/health)
    echo "📊 Health check response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    
    # Get root endpoint
    echo "📡 API root endpoint:"
    root=$(curl -s http://localhost:8001/)
    echo "$root" | python3 -m json.tool 2>/dev/null || echo "$root"
    echo ""
    
    echo "✅ Backend is working correctly!"
    echo "   API Docs: http://localhost:8001/docs"
    exit 0
else
    echo "❌ Backend is NOT running on port 8001"
    echo ""
    echo "To start the backend:"
    echo "  cd backend"
    echo "  source venv/bin/activate"
    echo "  python main.py"
    echo ""
    echo "See TROUBLESHOOT.md for more help"
    exit 1
fi

