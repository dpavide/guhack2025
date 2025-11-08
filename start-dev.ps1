# Quick Start Script
# Run this to start both backend and frontend

Write-Host "🚀 Starting GUHack2025 Rewards System..." -ForegroundColor Green
Write-Host ""

# Start backend
Write-Host "Starting backend on port 8001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\Project\guhack2025\backend; python -m uvicorn main:app --reload --port 8001"

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd E:\Project\guhack2025\frontend; npm run dev"

Write-Host ""
Write-Host "✅ Services starting..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend API: http://localhost:8001" -ForegroundColor Yellow
Write-Host "📍 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "📍 API Docs: http://localhost:8001/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in each terminal to stop services" -ForegroundColor Gray
