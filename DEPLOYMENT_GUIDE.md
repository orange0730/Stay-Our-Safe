# 🚀 Stay Our Safe - 完整部署指南

## 📋 部署檢查清單

### ✅ 已完成
- [x] 前端建構完成 (`frontend/dist` 目錄)
- [x] 後端建構完成 (`backend-new/dist` 目錄)
- [x] 最新功能包含：災害覆蓋層、Azure Maps 集成、AI 分析

---

## 🎯 **第一步：部署後端到 Azure**

### 1. 準備後端檔案
```bash
# 在 backend-new 目錄
Copy-Item "package.json" "dist/" -Force
Copy-Item "web.config" "dist/" -Force
Compress-Archive -Path "dist/*" -DestinationPath "backend-deploy.zip" -Force
```

### 2. Azure Web App 部署
1. 開啟瀏覽器前往：https://portal.azure.com
2. 找到您的 Web App：`stay-our-safe-backend-gcgagbbhgdawd0da`
3. 在左側選單點擊「**部署中心**」
4. 選擇「**ZIP 部署**」
5. 上傳 `backend-new/backend-deploy.zip`
6. 等待部署完成（約2-3分鐘）

### 3. 驗證後端部署
- 訪問：https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net/
- 應該看到：`"Stay Our Safe Backend is running!"`
- 測試 API：https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net/api/alerts/recent

---

## 🌐 **第二步：部署前端**

### 選項 A：Netlify（推薦，最簡單）

1. **拖放部署**
   - 開啟：https://app.netlify.com/drop
   - 將 `frontend/dist` 整個資料夾拖放到頁面上
   - 等待部署完成，獲得網址

2. **設定自訂域名（可選）**
   - 在 Netlify 控制台點擊「Domain settings」
   - 可以設定自訂域名

### 選項 B：Vercel

1. **上傳部署**
   - 前往：https://vercel.com
   - 點擊「New Project」
   - 上傳 `frontend/dist` 資料夾

### 選項 C：Azure Static Web Apps

1. **使用 VS Code 擴充功能**
   - 安裝 Azure Static Web Apps 擴充功能
   - 右鍵點擊 `frontend/dist` → Deploy to Static Web App

---

## ⚙️ **第三步：後端 CORS 設定**

部署完前端後，需要更新後端的 CORS 設定：

1. **前往 Azure Portal**
   - 開啟您的 Web App：`stay-our-safe-backend-gcgagbbhgdawd0da`

2. **設定環境變數**
   - 左側選單 → 「設定」→「環境變數」
   - 新增/更新：
     ```
     CORS_ORIGIN = https://您的前端網址.netlify.app
     ```

3. **重新啟動 Web App**
   - 點擊「重新啟動」讓設定生效

---

## 🧪 **第四步：測試完整系統**

### 1. 基本功能測試
- [x] 前端可以載入
- [x] 地圖顯示正常
- [x] 導航面板可以搜尋地址
- [x] 可以規劃路線

### 2. Azure Maps 功能測試
- [x] 地址自動完成
- [x] 精確路線規劃（非直線）
- [x] 災害避開功能

### 3. AI 分析功能測試
- [x] 每10秒自動爬取災害數據
- [x] AI 風險評估顯示
- [x] 管理員面板顯示分析結果

---

## 🔧 **故障排除**

### 前端連接後端失敗
1. 檢查 CORS 設定是否正確
2. 確認後端 API 端點可以訪問
3. 檢查瀏覽器開發者工具的 Network 標籤

### 導航功能異常
1. 確認 Azure Maps subscription key 已設定
2. 檢查後端日誌是否有 API 錯誤
3. 驗證 Azure Maps 帳單狀態

### AI 分析無數據
1. 檢查 OpenAI API key 是否有效
2. 確認外部 API 可以訪問
3. 查看後端日誌的爬取狀態

---

## 📱 **部署後的系統架構**

```
前端 (Netlify/Vercel)
    ↓ HTTPS API 呼叫
後端 (Azure Web App)
    ↓ 呼叫外部服務
├── Azure Maps (路線規劃)
├── OpenAI API (AI 分析)
└── 政府災害 API (數據爬取)
```

---

## 🎉 **部署完成確認**

當以下全部正常時，表示部署成功：

- ✅ 前端網站可以正常載入
- ✅ 後端 API 回應正常
- ✅ 地圖和導航功能運作
- ✅ AI 分析數據更新
- ✅ 災害覆蓋層顯示正常

恭喜！您的 Stay Our Safe 系統已完全部署並運行！ 🎊 