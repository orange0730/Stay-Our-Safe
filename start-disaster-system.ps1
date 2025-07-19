#!/usr/bin/env pwsh
# Stay Our Safe - 災害防護助手完整啟動腳本
# 支援自動爬取和AI分析功能

Write-Host "🚀 Starting Stay Our Safe Disaster Management System..." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

# 檢查依賴
Write-Host "🔍 Checking dependencies..." -ForegroundColor Yellow

# 檢查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js" -ForegroundColor Red
    exit 1
}

# 檢查 npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}

# 檢查項目目錄
$backendPath = "D:\Stay Our Safe\backend-new"
$frontendPath = "D:\Stay Our Safe\frontend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ All dependencies checked!" -ForegroundColor Green
Write-Host ""

# 函數：檢查端口是否被佔用
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $connection -ne $null
}

# 函數：停止佔用端口的進程
function Stop-PortProcess {
    param([int]$Port)
    $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess -Unique
    
    foreach ($pid in $processes) {
        try {
            Stop-Process -Id $pid -Force
            Write-Host "✅ Stopped process $pid on port $Port" -ForegroundColor Yellow
        } catch {
            Write-Host "⚠️ Could not stop process $pid" -ForegroundColor Yellow
        }
    }
}

# 檢查並清理端口
Write-Host "🔧 Checking and cleaning ports..." -ForegroundColor Yellow

if (Test-Port 3001) {
    Write-Host "⚠️ Port 3001 is in use, stopping processes..." -ForegroundColor Yellow
    Stop-PortProcess 3001
    Start-Sleep 2
}

if (Test-Port 3000) {
    Write-Host "⚠️ Port 3000 is in use, stopping processes..." -ForegroundColor Yellow
    Stop-PortProcess 3000
    Start-Sleep 2
}

Write-Host "✅ Ports cleaned!" -ForegroundColor Green
Write-Host ""

# 啟動後端
Write-Host "🔥 Starting Backend Server..." -ForegroundColor Blue
Write-Host "📍 Location: $backendPath" -ForegroundColor Gray
Write-Host "🌐 URL: http://localhost:3001" -ForegroundColor Gray
Write-Host "🤖 Features: Auto-crawl + AI Analysis (every 10s)" -ForegroundColor Gray

$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    $env:PORT = "3001"
    npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Output "✅ Backend build successful"
        node dist/index.js 2>&1
    } else {
        Write-Output "❌ Backend build failed"
        exit 1
    }
} -ArgumentList $backendPath

# 等待後端啟動
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
$backendStarted = $false
$attempts = 0
$maxAttempts = 30

while (-not $backendStarted -and $attempts -lt $maxAttempts) {
    Start-Sleep 2
    $attempts++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/hazards" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendStarted = $true
            Write-Host "✅ Backend is running!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⏳ Attempt $attempts/$maxAttempts - Backend starting..." -ForegroundColor Yellow
    }
}

if (-not $backendStarted) {
    Write-Host "❌ Backend failed to start after $maxAttempts attempts" -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""

# 啟動前端
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Magenta
Write-Host "📍 Location: $frontendPath" -ForegroundColor Gray
Write-Host "🌐 URL: http://localhost:3000" -ForegroundColor Gray
Write-Host "✨ Features: Real-time UI + Map Navigation" -ForegroundColor Gray

$frontendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    npm run dev 2>&1
} -ArgumentList $frontendPath

# 等待前端啟動
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
$frontendStarted = $false
$attempts = 0
$maxAttempts = 20

while (-not $frontendStarted -and $attempts -lt $maxAttempts) {
    Start-Sleep 3
    $attempts++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $frontendStarted = $true
            Write-Host "✅ Frontend is running!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⏳ Attempt $attempts/$maxAttempts - Frontend starting..." -ForegroundColor Yellow
    }
}

if (-not $frontendStarted) {
    Write-Host "❌ Frontend failed to start after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "🔍 Check frontend job output:" -ForegroundColor Yellow
    Receive-Job $frontendJob | Select-Object -Last 10
    
    # 清理
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""

# 成功訊息
Write-Host "🎉 Stay Our Safe System Started Successfully!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 API Docs:  http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "🤖 AI Features Active:" -ForegroundColor Yellow
Write-Host "   • Auto-crawl every 10 seconds" -ForegroundColor White
Write-Host "   • Real-time risk analysis" -ForegroundColor White
Write-Host "   • Smart route planning" -ForegroundColor White
Write-Host "   • Disaster alerts & filtering" -ForegroundColor White
Write-Host ""
Write-Host "📱 Usage:" -ForegroundColor Yellow
Write-Host "   • 🗺️ Navigate: Click navigation button" -ForegroundColor White
Write-Host "   • 📋 Disasters: Click list button for filtered view" -ForegroundColor White
Write-Host "   • ⚙️ Admin: Click settings for AI analysis" -ForegroundColor White
Write-Host "   • 📊 Dashboard: Click grid for detailed stats" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Auto-refresh: Frontend updates every 15s" -ForegroundColor Green
Write-Host "🚨 High-risk alerts will show automatically" -ForegroundColor Red
Write-Host ""

# 等待用戶操作
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   • Try setting up navigation from Taipei to Taichung" -ForegroundColor White
Write-Host "   • Check 'Recent Disaster Info' for AI analysis" -ForegroundColor White
Write-Host "   • Watch for real-time risk level changes" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Gray

# 監控服務狀態
try {
    while ($true) {
        # 檢查後端狀態
        try {
            $backendResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auto-crawl/status" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($backendResponse.StatusCode -eq 200) {
                $status = $backendResponse.Content | ConvertFrom-Json
                if ($status.data.isRunning) {
                    Write-Host "🤖 Auto-crawl active - $($status.data.totalAnalyses) analyses completed" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Auto-crawl stopped" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "❌ Backend connection lost" -ForegroundColor Red
        }
        
        Start-Sleep 30
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Shutting down services..." -ForegroundColor Yellow
    
    # 清理工作
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    
    # 停止端口進程
    Stop-PortProcess 3001
    Stop-PortProcess 3000
    
    Write-Host "✅ All services stopped. Goodbye!" -ForegroundColor Green
} 