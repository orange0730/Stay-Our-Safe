# Stay Our Safe 啟動腳本
Write-Host "🚀 啟動 Stay Our Safe 應用程式..." -ForegroundColor Green

# 檢查 Node.js 是否安裝
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 錯誤: 未安裝 Node.js" -ForegroundColor Red
    exit 1
}

# 啟動後端
Write-Host "📡 啟動後端服務..." -ForegroundColor Yellow
$backendPath = "D:\Stay Our Safe\backend-new"
if (Test-Path $backendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; `$env:PORT=3001; Write-Host '🟢 後端啟動在 http://localhost:3001' -ForegroundColor Green; npm start"
    Start-Sleep -Seconds 3
} else {
    Write-Host "❌ 錯誤: 找不到後端目錄 $backendPath" -ForegroundColor Red
    exit 1
}

# 啟動前端
Write-Host "🌐 啟動前端服務..." -ForegroundColor Yellow
$frontendPath = "D:\Stay Our Safe\frontend"
if (Test-Path $frontendPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; Write-Host '🟢 前端啟動在 http://localhost:3000' -ForegroundColor Green; npm run dev"
} else {
    Write-Host "❌ 錯誤: 找不到前端目錄 $frontendPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 啟動完成！" -ForegroundColor Green
Write-Host "📱 前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📡 後端: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🧪 測試頁面: file:///D:/Stay%20Our%20Safe/test-navigation.html" -ForegroundColor Cyan

# 等待用戶輸入
Read-Host "按 Enter 鍵關閉此窗口..." 