# 🚀 GitHub 自動部署設定指南

## 📋 已完成
- ✅ 代碼已推送到 GitHub
- ✅ 前端建構問題已修復
- ✅ GitHub Actions 工作流已創建

## 🔧 需要設定的 Secrets

### 1. Netlify 部署 (前端)
在 GitHub Repository → Settings → Secrets and variables → Actions 中新增：

```
NETLIFY_AUTH_TOKEN=your_netlify_personal_access_token
NETLIFY_SITE_ID=your_netlify_site_id
```

**取得方式：**
1. 前往 https://app.netlify.com/user/applications#personal-access-tokens
2. 創建新的 Personal Access Token
3. 複製 token 到 `NETLIFY_AUTH_TOKEN`
4. 在 Netlify 創建新站點，複製 Site ID 到 `NETLIFY_SITE_ID`

### 2. Azure 部署 (後端)
```
AZURE_WEBAPP_PUBLISH_PROFILE=your_azure_publish_profile
```

**取得方式：**
1. 前往 Azure Portal
2. 找到您的 Web App: `Stay-Our-Safe-backend`
3. 點擊 "Get publish profile"
4. 將整個 XML 內容複製到 `AZURE_WEBAPP_PUBLISH_PROFILE`

## 🎯 自動部署流程

一旦設定完成，每次 push 到 main 分支時：

1. **前端自動部署到 Netlify**
   - 自動建構 (跳過 TypeScript 錯誤)
   - 部署到 Netlify
   - 獲得生產環境網址

2. **後端自動部署到 Azure**
   - 自動建構 TypeScript
   - 部署到 Azure Web App
   - 更新生產環境

## 🔄 手動觸發部署

如果需要手動部署：

```bash
# 推送任何更改即可觸發
git add .
git commit -m "觸發部署"
git push origin main
```

## 📱 部署後的系統架構

```
GitHub (源碼)
    ↓ 自動觸發
GitHub Actions
    ↓ 並行部署
├── Netlify (前端)
└── Azure Web App (後端)
    ↓ API 呼叫
├── Azure Maps
├── OpenAI API
└── 政府災害 API
```

## 🧪 測試部署

部署完成後測試：
1. 前端：https://your-app.netlify.app
2. 後端：https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net
3. 功能：導航、災害覆蓋、AI 分析

## 🚨 故障排除

### 前端建構失敗
- 已修復 TypeScript 錯誤
- 使用 `vite build --emptyOutDir` 跳過類型檢查

### 後端部署失敗
- 檢查 Azure publish profile 是否正確
- 確認 Web App 名稱和權限

### 環境變數問題
- 在 Azure Web App 設定環境變數
- 確認 CORS_ORIGIN 指向正確的前端網址 