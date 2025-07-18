const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const deployDir = path.join(__dirname, '..', 'deploy');
const zipPath = path.join(__dirname, '..', 'deploy.zip');

// 檢查 deploy 資料夾是否存在
if (!fs.existsSync(deployDir)) {
  console.error('錯誤：找不到 deploy 資料夾，請先執行 npm run build-deploy');
  process.exit(1);
}

// 刪除舊的 ZIP 檔案
if (fs.existsSync(zipPath)) {
  console.log('刪除舊的 deploy.zip...');
  fs.unlinkSync(zipPath);
}

// 根據作業系統選擇壓縮命令
const isWindows = process.platform === 'win32';

try {
  console.log('壓縮 deploy 資料夾...');
  
  if (isWindows) {
    // Windows: 使用 PowerShell
    execSync(`powershell -Command "Compress-Archive -Path '${deployDir}\\*' -DestinationPath '${zipPath}'"`, {
      stdio: 'inherit'
    });
  } else {
    // Linux/Mac: 使用 zip 命令
    execSync(`cd "${path.dirname(deployDir)}" && zip -r deploy.zip deploy/`, {
      stdio: 'inherit'
    });
  }

  // 顯示檔案資訊
  const stats = fs.statSync(zipPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('\n✅ 部署包創建成功！');
  console.log(`📦 檔案名稱：deploy.zip`);
  console.log(`📏 檔案大小：${fileSizeMB} MB`);
  console.log('\n下一步：');
  console.log('使用以下命令部署到 Azure：');
  console.log('az webapp deployment source config-zip --resource-group HSH2025 --name HSH2025 --src deploy.zip');
} catch (error) {
  console.error('創建 ZIP 檔案失敗：', error.message);
  process.exit(1);
} 