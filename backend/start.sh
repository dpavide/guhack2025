#!/bin/bash
# Quick start script for GUHack2025 backend

echo "🚀 Starting GUHack2025 Backend..."
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Virtual environment not activated!"
    echo "   Run: source venv/bin/activate"
    echo ""
    exit 1
fi

# Check environment variables
echo "🔍 Checking environment configuration..."
python check_env.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Environment check failed. Please fix the issues above."
    exit 1
fi

echo ""
echo "✅ Environment OK! Starting server on port 8001..."
echo ""
echo "📚 API Documentation: http://localhost:8001/docs"
echo "🔧 Health Check: http://localhost:8001/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
python main.py

