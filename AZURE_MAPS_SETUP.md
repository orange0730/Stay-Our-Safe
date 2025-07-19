# Azure Maps 設定指南

## 🗺️ Azure Maps 整合設定

### 1. 獲取 Azure Maps 訂閱金鑰

1. 前往 [Azure Portal](https://portal.azure.com/)
2. 創建新的 **Azure Maps Account**
3. 在 Azure Maps 帳戶中，點擊 **Authentication**
4. 複製 **Primary Key** 或 **Secondary Key**

### 2. 設定環境變數

#### 後端設定 (backend-new/.env)
```bash
# Azure Maps Configuration
AZURE_MAPS_KEY=your-azure-maps-subscription-key-here

# Server Configuration
PORT=3001
NODE_ENV=development
```

#### 前端設定 (frontend/.env)
```bash
# Azure Maps Configuration
VITE_AZURE_MAPS_KEY=your-azure-maps-subscription-key-here

# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. 功能特色

#### ✅ 已整合功能
- **精確路線規劃**: 使用 Azure Maps Route Directions API
- **多種旅行模式**: driving, walking, cycling, transit
- **災害避開**: 智能路線調整避開災害區域
- **即時交通**: 考慮當前交通狀況
- **詳細導航指令**: 逐步轉彎指示
- **中文支援**: 繁體中文導航指令

#### 🔧 技術實現
- **Backend**: Azure Maps REST API 整合
- **Frontend**: 響應式導航UI，支援各種螢幕尺寸
- **錯誤處理**: 自動降級到模擬路線
- **類型安全**: 完整的 TypeScript 類型定義

### 4. API 端點

#### 路線規劃
```
POST /api/map/route
```

**請求參數**:
```json
{
  "start": {"lat": 25.0338, "lng": 121.5645},
  "end": {"lat": 25.0565, "lng": 121.6183},
  "preferSafety": true,
  "avoidHazardTypes": ["flood", "fire"],
  "mode": "driving"
}
```

**回應格式**:
```json
{
  "success": true,
  "data": {
    "safestRoute": {
      "distance": 5420,
      "duration": 1260,
      "path": [...],
      "warnings": ["已避開 2 個災害區域"],
      "instructions": ["開始導航", "直行 500 公尺", "..."]
    },
    "fastestRoute": {...},
    "balancedRoute": {...}
  },
  "source": "azure-maps"
}
```

### 5. 使用方式

#### 開啟導航面板
1. 在地圖介面點擊 **"路線規劃"** 按鈕
2. 輸入起點和終點地址
3. 選擇旅行模式和路線類型
4. 選擇要避開的災害類型
5. 點擊 **"開始導航"**

#### 支援的地點
- **台北**: 台北101, 台北車站, 西門町, 信義區, 大安區, 松山機場
- **新北**: 淡水
- **台中**: 台中市區
- **高雄**: 高雄市區

### 6. 故障排除

#### 問題: "Azure Maps not configured"
**解決**: 檢查環境變數是否正確設定

#### 問題: 路線計算失敗
**解決**: 
1. 檢查網路連線
2. 確認 Azure Maps 訂閱金鑰有效
3. 檢查 API 配額是否超出

#### 問題: UI 顯示不正常
**解決**: 清除瀏覽器快取並重新載入

### 7. 開發模式

#### 不使用 Azure Maps (測試模式)
如果沒有 Azure Maps 金鑰，系統會自動使用模擬數據：

```bash
# 不設定 AZURE_MAPS_KEY，系統會顯示：
# ⚠️ Azure Maps 配置不完整，將使用模擬模式
```

#### 啟動開發服務器
```bash
# 後端
cd backend-new
npm run build
npm start

# 前端  
cd frontend
npm run dev
```

### 8. 生產部署

#### Azure Web App
```bash
# 在 Azure Web App 設定環境變數
az webapp config appsettings set \
  --name your-app-name \
  --resource-group your-resource-group \
  --settings AZURE_MAPS_KEY="your-key"
```

#### Docker 部署
```dockerfile
ENV AZURE_MAPS_KEY=your-azure-maps-key
ENV PORT=3001
```

### 9. 成本考量

#### Azure Maps 定價
- **免費層**: 每月 1,000 筆交易
- **標準層**: 每 1,000 筆交易 $0.50 USD
- **路線規劃**: 每次 API 呼叫計為 1 筆交易

#### 優化建議
- 實施路線快取機制
- 合併多個相近的路線請求
- 監控 API 使用量

### 10. 安全性

#### 金鑰保護
- ✅ 後端環境變數
- ✅ 不在程式碼中硬編碼
- ✅ 使用 HTTPS
- ✅ 定期輪替金鑰

#### API 限制
- 實施請求頻率限制
- 驗證請求來源
- 記錄 API 使用情況

---

## 📞 技術支援

如有問題，請檢查：
1. [Azure Maps 文檔](https://docs.microsoft.com/azure/azure-maps/)
2. [API 參考](https://docs.microsoft.com/rest/api/maps/)
3. 專案 GitHub Issues

**系統狀態**: ✅ Azure Maps 整合完成並運行正常 