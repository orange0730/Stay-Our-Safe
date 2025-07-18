# PowerShell 腳本：創建部署 ZIP 檔案

# 檢查 deploy 資料夾是否存在
if (!(Test-Path -Path "deploy")) {
    Write-Error "錯誤：找不到 deploy 資料夾，請先執行 npm run build-deploy"
    exit 1
}

# 刪除舊的 ZIP 檔案
if (Test-Path -Path "deploy.zip") {
    Write-Host "刪除舊的 deploy.zip..."
    Remove-Item -Path "deploy.zip"
}

# 創建新的 ZIP 檔案
Write-Host "壓縮 deploy 資料夾..."
Compress-Archive -Path "deploy\*" -DestinationPath "deploy.zip"

# 顯示檔案資訊
$zipInfo = Get-Item "deploy.zip"
Write-Host "`n✅ 部署包創建成功！"
Write-Host "📦 檔案名稱：deploy.zip"
Write-Host "📏 檔案大小：$([math]::Round($zipInfo.Length / 1MB, 2)) MB"
Write-Host "`n下一步："
Write-Host "使用以下命令部署到 Azure："
Write-Host "az webapp deployment source config-zip --resource-group HSH2025 --name HSH2025 --src deploy.zip" 