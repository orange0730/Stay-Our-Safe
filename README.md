# Stay Our Safe - 災害防護助手

一個社群自發的災害防護助手，透過整合政府與社群資料，提供即時的災害資訊、風險評估、路線規劃等功能。

## 功能特色

- 🌍 **即時災害地圖** - 在地圖上顯示各類災害熱區
- 📊 **AI 風險評估** - 結合 AI 生成文字風險評估報告
- 🚨 **智慧警示系統** - 進入高風險區域時自動推播語音與視覺警示
- 🛤️ **避難路線規劃** - 提供最安全與最快速兩種路線選擇
- 📱 **社群互助上報** - 接收使用者上報的災害資訊
- 🔄 **自動資料更新** - 定期擷取最新的政府與社群資料

## 技術架構

### 後端
- Node.js + Express + TypeScript
- 模組化架構設計
- RESTful API
- Azure Cosmos DB 資料儲存

### 前端
- React + TypeScript + Vite
- Azure Maps 地圖元件
- Zustand 狀態管理
- TailwindCSS 樣式
- React Query 資料管理

### Azure Functions
- 定時資料爬取
- AI 資料分析
- Cosmos DB 觸發器

## 快速開始

### 環境需求
- Node.js 16+
- npm 或 yarn
- Azure 帳號（用於部署）

### 安裝步驟

1. 複製專案
```bash
git clone <repository-url>
cd Stay-Our-Safe
```

2. 安裝後端依賴
```bash
cd backend
npm install
```

3. 設定後端環境變數
```bash
cp env.example .env
# 編輯 .env 檔案，填入必要的 API 金鑰
```

**必要的環境變數：**
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI 服務端點
- `AZURE_OPENAI_API_KEY`: Azure OpenAI API 金鑰
- `AZURE_OPENAI_DEPLOYMENT_NAME`: OpenAI 部署名稱
- `COSMOS_CONNECTION_STRING`: Azure Cosmos DB 連接字串
- `CWA_API_KEY`: 中央氣象局 API 金鑰

4. 啟動後端服務
```bash
npm run dev
# 服務將在 http://localhost:3001 啟動
```

5. 開啟新終端機，安裝前端依賴
```bash
cd frontend
npm install
```

6. 設定前端環境變數
```bash
cp env.example .env
# 編輯 .env 檔案，填入 Azure Maps 金鑰
```

**前端必要的環境變數：**
- `VITE_AZURE_MAPS_KEY`: Azure Maps 訂閱金鑰

7. 啟動前端開發伺服器
```bash
npm run dev
# 應用程式將在 http://localhost:3000 開啟
```

### Azure Functions 設定

1. 進入 Azure Functions 目錄
```bash
cd azure-functions
npm install
```

2. 設定本地環境
```bash
cp local.settings.json.example local.settings.json
# 編輯 local.settings.json，填入 API 金鑰
```

3. 啟動本地 Functions
```bash
npm run build
npm start
```

## 部署指南

### 後端部署 (Azure App Service)

1. 建置專案
```bash
cd backend
npm run build-deploy
```

2. 部署到 Azure
```bash
az webapp deploy --resource-group <your-resource-group> --name <your-app-name> --src-path deploy.zip --type zip
```

3. 在 Azure Portal 設定環境變數

### 前端部署 (Azure Static Web Apps)

1. 建置專案
```bash
cd frontend
npm run build
```

2. 部署 dist 資料夾到 Azure Static Web Apps

### Azure Functions 部署

```bash
cd azure-functions
func azure functionapp publish <your-function-app-name>
```

## API 端點

### 災害資料
- `GET /api/hazards` - 取得所有災害資料
- `GET /api/hazards/:id` - 取得特定災害詳情
- `POST /api/hazards/refresh` - 手動更新資料
- `GET /api/hazards/area/:lat/:lng/:radius` - 取得區域內災害

### 使用者上報
- `POST /api/reports` - 提交新上報
- `GET /api/reports` - 取得上報列表
- `PUT /api/reports/:id` - 更新上報
- `DELETE /api/reports/:id` - 刪除上報

### 風險評估
- `GET /api/risks/assessment` - 生成風險評估
- `POST /api/risks/assessment` - 為特定區域生成評估

### 地圖與路線
- `POST /api/map/route` - 規劃避難路線
- `GET /api/map/heatmap` - 取得熱區資料
- `GET /api/map/bounds` - 取得地圖邊界

## 開發指南

### 新增災害類型
在 `shared/types/index.ts` 的 `HazardType` enum 中新增類型。

### 調整風險評估邏輯
修改 `backend/src/modules/generateRisk/riskAssessmentService.ts`。

### 自訂地圖樣式
編輯 `frontend/src/components/AzureMap.tsx` 中的樣式設定。

## 注意事項

1. **API 金鑰安全性**：
   - 絕對不要將真實的 API 金鑰推送到 GitHub
   - 使用 Azure Key Vault 或環境變數來管理敏感資訊
   - 定期更換 API 金鑰

2. **環境設定**：
   - 開發環境使用 `.env` 檔案
   - 生產環境在 Azure Portal 設定環境變數
   - 使用不同的資源群組來分離開發和生產環境

3. **監控與日誌**：
   - 生產環境建議啟用 Application Insights
   - 定期檢查 Cosmos DB 的使用量和效能
   - 監控 Azure Functions 的執行狀況

## 貢獻指南

1. Fork 這個專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 授權

這個專案使用 MIT 授權 - 查看 [LICENSE](LICENSE) 檔案了解詳情。

## 支援

如果您在使用過程中遇到問題，請：
1. 檢查 [Issues](../../issues) 是否有類似問題
2. 建立新的 Issue 並提供詳細的錯誤資訊
3. 加入我們的討論群組 