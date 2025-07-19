# 🚀 Stay Our Safe - 快速直接部署
Write-Host "=== Stay Our Safe 快速部署開始 ===" -ForegroundColor Green

# 1. 檢查 Azure CLI 登入狀態
Write-Host "🔐 檢查 Azure 登入狀態..." -ForegroundColor Yellow
try {
    $account = az account show --output json | ConvertFrom-Json
    Write-Host "✅ 已登入 Azure: $($account.user.name)" -ForegroundColor Green
} catch {
    Write-Host "❌ 未登入 Azure，正在開啟登入..." -ForegroundColor Red
    az login
}

# 2. 直接部署後端到 Azure Web App
Write-Host ""
Write-Host "🚀 部署後端到 Azure Web App..." -ForegroundColor Yellow
$resourceGroup = "StayOurSafe_group"
$webAppName = "stay-our-safe-backend-gcgagbbhgdawd0da"
$zipPath = "backend-new\backend-deploy.zip"

if (Test-Path $zipPath) {
    Write-Host "📦 正在部署 $zipPath..." -ForegroundColor Gray
    
    # 使用 Azure CLI 直接部署 ZIP
    az webapp deployment source config-zip --resource-group $resourceGroup --name $webAppName --src $zipPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 後端部署成功！" -ForegroundColor Green
        Write-Host "🌐 後端網址: https://$webAppName.azurewebsites.net" -ForegroundColor Cyan
    } else {
        Write-Host "❌ 後端部署失敗" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ 找不到後端部署檔案: $zipPath" -ForegroundColor Red
    exit 1
}

# 3. 測試後端 API
Write-Host ""
Write-Host "🧪 測試後端 API..." -ForegroundColor Yellow
$backendUrl = "https://$webAppName.azurewebsites.net"
try {
    $response = Invoke-RestMethod -Uri $backendUrl -Method GET -TimeoutSec 10
    Write-Host "✅ 後端 API 回應正常: $response" -ForegroundColor Green
} catch {
    Write-Host "⚠️  後端可能還在啟動中，請稍等..." -ForegroundColor Yellow
}

# 4. 使用 Netlify CLI 部署前端 (如果有安裝)
Write-Host ""
Write-Host "🌐 嘗試自動部署前端..." -ForegroundColor Yellow

# 檢查是否有 Netlify CLI
$netlifyCli = Get-Command "netlify" -ErrorAction SilentlyContinue
if ($netlifyCli) {
    Write-Host "📦 使用 Netlify CLI 部署前端..." -ForegroundColor Gray
    cd frontend
    netlify deploy --prod --dir dist
    cd ..
    Write-Host "✅ 前端部署完成！" -ForegroundColor Green
} else {
    Write-Host "📋 Netlify CLI 未安裝，提供手動部署指引..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "請手動完成前端部署:" -ForegroundColor White
    Write-Host "1. 前往: https://app.netlify.com/drop" -ForegroundColor Cyan
    Write-Host "2. 拖放資料夾: frontend\dist" -ForegroundColor Cyan
    Write-Host "3. 獲得網址後，執行以下指令更新 CORS:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "az webapp config appsettings set --resource-group $resourceGroup --name $webAppName --settings CORS_ORIGIN=https://您的前端網址.netlify.app" -ForegroundColor Yellow
    Write-Host ""
    
    # 自動開啟 Netlify
    Start-Process "https://app.netlify.com/drop"
    Start-Process "explorer.exe" -ArgumentList "frontend\dist"
}

# 5. 如果有 Vercel CLI
$vercelCli = Get-Command "vercel" -ErrorAction SilentlyContinue
if ($vercelCli -and !$netlifyCli) {
    Write-Host "📦 或使用 Vercel CLI 部署前端..." -ForegroundColor Gray
    cd frontend\dist
    vercel --prod
    cd ..\..
}

Write-Host ""
Write-Host "🎉 部署指令執行完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 檢查清單:" -ForegroundColor Cyan
Write-Host "✅ 後端已部署到 Azure" -ForegroundColor White
Write-Host "🔄 前端需要手動完成或安裝 CLI 工具" -ForegroundColor White
Write-Host "⚙️  部署前端後記得更新 CORS 設定" -ForegroundColor White

# 提供快速安裝 Netlify CLI 的指令
Write-Host ""
Write-Host "💡 快速安裝部署工具 (可選):" -ForegroundColor Yellow
Write-Host "npm install -g netlify-cli" -ForegroundColor Gray
Write-Host "npm install -g vercel" -ForegroundColor Gray 