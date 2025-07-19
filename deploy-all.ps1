# 🚀 Stay Our Safe - 自動化部署腳本
Write-Host "=== Stay Our Safe 自動化部署開始 ===" -ForegroundColor Green

# 檢查檔案是否存在
Write-Host "📋 檢查部署檔案..." -ForegroundColor Yellow

$backendZip = "D:\Stay Our Safe\backend-new\backend-deploy.zip"
$frontendDist = "D:\Stay Our Safe\frontend\dist"

if (Test-Path $backendZip) {
    Write-Host "✅ 後端部署檔案已準備: $backendZip" -ForegroundColor Green
} else {
    Write-Host "❌ 後端部署檔案不存在: $backendZip" -ForegroundColor Red
    exit 1
}

if (Test-Path $frontendDist) {
    Write-Host "✅ 前端建構檔案已準備: $frontendDist" -ForegroundColor Green
} else {
    Write-Host "❌ 前端建構檔案不存在: $frontendDist" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 部署資訊:" -ForegroundColor Cyan
Write-Host "   後端: stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net" -ForegroundColor White
Write-Host "   前端: 將部署到 Netlify" -ForegroundColor White
Write-Host ""

# 步驟1: 開啟 Azure Portal
Write-Host "🌐 步驟1: 開啟 Azure Portal 進行後端部署..." -ForegroundColor Yellow
Write-Host "   📁 檔案位置: $backendZip" -ForegroundColor Gray
Write-Host "   🔗 目標網址: https://portal.azure.com" -ForegroundColor Gray
Write-Host ""
Write-Host "請按照以下步驟操作:" -ForegroundColor White
Write-Host "1. 搜尋並開啟: stay-our-safe-backend-gcgagbbhgdawd0da" -ForegroundColor White
Write-Host "2. 左側選單 → 部署中心" -ForegroundColor White
Write-Host "3. 選擇 ZIP 部署" -ForegroundColor White
Write-Host "4. 上傳檔案: $backendZip" -ForegroundColor White
Write-Host ""

# 自動開啟 Azure Portal
try {
    Start-Process "https://portal.azure.com"
    Write-Host "✅ Azure Portal 已開啟" -ForegroundColor Green
} catch {
    Write-Host "⚠️  請手動開啟 Azure Portal" -ForegroundColor Yellow
}

Read-Host "完成後端部署後，按 Enter 繼續前端部署"

# 步驟2: 前端部署到 Netlify
Write-Host ""
Write-Host "🌐 步驟2: 開啟 Netlify 進行前端部署..." -ForegroundColor Yellow
Write-Host "   📁 檔案位置: $frontendDist" -ForegroundColor Gray
Write-Host "   🔗 目標網址: https://app.netlify.com/drop" -ForegroundColor Gray
Write-Host ""
Write-Host "請按照以下步驟操作:" -ForegroundColor White
Write-Host "1. 將會自動開啟 Netlify Drop 頁面" -ForegroundColor White
Write-Host "2. 將整個 dist 資料夾拖放到頁面上" -ForegroundColor White
Write-Host "3. 等待部署完成" -ForegroundColor White
Write-Host "4. 複製獲得的網址" -ForegroundColor White
Write-Host ""

# 自動開啟檔案總管和 Netlify
try {
    Start-Process "explorer.exe" -ArgumentList $frontendDist
    Write-Host "✅ 前端檔案資料夾已開啟" -ForegroundColor Green
    Start-Sleep 2
    Start-Process "https://app.netlify.com/drop"
    Write-Host "✅ Netlify Drop 頁面已開啟" -ForegroundColor Green
} catch {
    Write-Host "⚠️  請手動開啟檔案總管和 Netlify" -ForegroundColor Yellow
}

$frontendUrl = Read-Host "請輸入前端部署完成後的網址 (例: https://your-app.netlify.app)"

if ($frontendUrl) {
    Write-Host ""
    Write-Host "🔧 步驟3: 更新後端 CORS 設定..." -ForegroundColor Yellow
    Write-Host "請在 Azure Portal 中:" -ForegroundColor White
    Write-Host "1. 返回您的 Web App: stay-our-safe-backend-gcgagbbhgdawd0da" -ForegroundColor White
    Write-Host "2. 左側選單 → 設定 → 環境變數" -ForegroundColor White
    Write-Host "3. 新增或更新變數:" -ForegroundColor White
    Write-Host "   名稱: CORS_ORIGIN" -ForegroundColor Cyan
    Write-Host "   值: $frontendUrl" -ForegroundColor Cyan
    Write-Host "4. 點擊儲存" -ForegroundColor White
    Write-Host "5. 重新啟動 Web App" -ForegroundColor White
    Write-Host ""
}

Read-Host "完成 CORS 設定後，按 Enter 繼續"

# 步驟4: 測試部署
Write-Host ""
Write-Host "🧪 步驟4: 測試部署結果..." -ForegroundColor Yellow

if ($frontendUrl) {
    Write-Host "正在開啟前端網站進行測試..." -ForegroundColor Gray
    try {
        Start-Process $frontendUrl
        Write-Host "✅ 前端網站已開啟: $frontendUrl" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  請手動開啟: $frontendUrl" -ForegroundColor Yellow
    }
}

Write-Host "正在開啟後端 API 進行測試..." -ForegroundColor Gray
try {
    Start-Process "https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net/"
    Write-Host "✅ 後端 API 已開啟" -ForegroundColor Green
} catch {
    Write-Host "⚠️  請手動測試後端 API" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 部署完成！請測試以下功能:" -ForegroundColor Green
Write-Host "✅ 前端網站載入" -ForegroundColor White
Write-Host "✅ 地圖顯示正常" -ForegroundColor White
Write-Host "✅ 導航功能可用" -ForegroundColor White
Write-Host "✅ 災害覆蓋層顯示" -ForegroundColor White
Write-Host "✅ AI 分析數據更新" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Stay Our Safe 系統已成功部署！" -ForegroundColor Green

Read-Host "按 Enter 結束" 