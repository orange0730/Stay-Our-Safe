# Stay Our Safe - Azure Functions

這是災害防護助手的 Azure Functions 專案，用於定期爬取政府防災 API 資料並進行 AI 分析。

## 功能說明

### 1. 資料爬取 Functions (Timer Trigger)

- **CWADataFetcher**: 每 30 分鐘爬取中央氣象局資料
  - 地震資訊
  - 天氣警報

- **WRADataFetcher**: 每 20 分鐘爬取水利署防災資料
  - 即時水位
  - 即時雨量

### 2. 資料分析 Function (Cosmos DB Change Feed Trigger)

- **DataAnalyzer**: 監聽 Cosmos DB 變更，自動分析新資料
  - 使用 Azure OpenAI 進行風險評估
  - 產生警示訊息
  - 觸發高危警報通知

## 部署步驟

### 1. 本地開發

```bash
# 安裝依賴
npm install

# 編譯 TypeScript
npm run build

# 啟動本地 Functions
npm start
```

### 2. 設定環境變數

在 Azure Portal 或 local.settings.json 中設定：

- `COSMOS_CONNECTION_STRING`: Cosmos DB 連線字串
- `CWA_API_KEY`: 中央氣象局 API Key
- `WRA_API_KEY`: 水利署 API Key
- `OPENAI_ENDPOINT`: Azure OpenAI 端點
- `OPENAI_API_KEY`: Azure OpenAI API Key
- `OPENAI_DEPLOYMENT_NAME`: OpenAI 部署名稱

### 3. 部署到 Azure

```bash
# 使用 Azure Functions Core Tools
func azure functionapp publish <FunctionAppName>

# 或使用 VS Code Azure Functions 擴充功能
```

## Cosmos DB 結構

- **資料庫**: SampleDB
- **容器**: user
- **分割區索引鍵**: /source

### 資料格式

```json
{
  "id": "unique-id",
  "timestamp": "2024-01-01T12:00:00Z",
  "location": {
    "name": "台北市",
    "lat": 25.033,
    "lng": 121.564
  },
  "parameter": "earthquake_magnitude",
  "value": 4.5,
  "unit": "ML",
  "source": "CWA",
  "alert": "地震警報：規模 4.5",
  "alertLevel": "high",
  "analyzedAt": "2024-01-01T12:01:00Z"
}
```

## 監控與除錯

1. **Application Insights**: 查看 Functions 執行記錄
2. **Cosmos DB Data Explorer**: 檢查儲存的資料
3. **本地除錯**: 使用 VS Code 進行中斷點除錯

## 注意事項

1. **API 限制**: 注意各政府 API 的呼叫頻率限制
2. **成本控管**: 監控 Cosmos DB 和 OpenAI 的使用量
3. **安全性**: 建議將敏感資訊移至 Azure Key Vault

## 擴充建議

1. 新增更多資料來源（如地質調查所）
2. 實作多種通知管道（Email、LINE、SMS）
3. 建立資料視覺化儀表板
4. 加入機器學習模型進行更精準的預測 