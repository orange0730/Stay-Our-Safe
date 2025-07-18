const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 部署資料夾路徑
const deployDir = path.join(__dirname, '..', 'deploy');
const distDir = path.join(__dirname, '..', 'dist');

// 創建部署資料夾
console.log('創建部署資料夾...');
fs.mkdirSync(deployDir, { recursive: true });

// 複製 package.json 和 package-lock.json
console.log('複製 package.json 和 package-lock.json...');
fs.copyFileSync(
  path.join(__dirname, '..', 'package.json'),
  path.join(deployDir, 'package.json')
);

if (fs.existsSync(path.join(__dirname, '..', 'package-lock.json'))) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'package-lock.json'),
    path.join(deployDir, 'package-lock.json')
  );
}

// 複製 dist 資料夾
console.log('複製編譯後的程式碼...');
function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  if (fs.lstatSync(source).isDirectory()) {
    const files = fs.readdirSync(source);
    files.forEach(file => {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

if (fs.existsSync(distDir)) {
  copyFolderRecursiveSync(distDir, path.join(deployDir, 'dist'));
} else {
  console.error('錯誤：找不到 dist 資料夾，請先執行 npm run build');
  process.exit(1);
}

// 複製 .env.example 作為參考
console.log('複製環境變數範例...');
if (fs.existsSync(path.join(__dirname, '..', 'env.example'))) {
  fs.copyFileSync(
    path.join(__dirname, '..', 'env.example'),
    path.join(deployDir, '.env.example')
  );
}

// 在部署資料夾中安裝 production 依賴
console.log('安裝 production 依賴...');
execSync('npm install --production', {
  cwd: deployDir,
  stdio: 'inherit'
});

// 創建 web.config (for Azure App Service on Windows)
console.log('創建 web.config...');
const webConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="dist/index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^dist/index.js\\/debug[\\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="dist/index.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
    <iisnode node_env="production" 
             nodeProcessCommandLine="node" 
             loggingEnabled="true"
             logDirectory="iisnode"
             debuggingEnabled="false"
             devErrorsEnabled="false" />
  </system.webServer>
</configuration>`;

fs.writeFileSync(path.join(deployDir, 'web.config'), webConfig);

console.log('\n✅ 部署包準備完成！');
console.log(`📁 部署資料夾位置：${deployDir}`);
console.log('\n下一步：');
console.log('1. 將 deploy 資料夾壓縮成 deploy.zip');
console.log('2. 使用 Azure CLI 或 Portal 上傳部署包'); 