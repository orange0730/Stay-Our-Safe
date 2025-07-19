# 🔍 GitHub Actions Azure 部署錯誤排除

## ❌ 當前錯誤
```
Error: No credentials found. Add an Azure login action before this action.
```

## 🔧 檢查清單

### 1. 確認 Secret 名稱
在 GitHub Repository → Settings → Secrets → Actions 中確認：
- ✅ Secret 名稱必須是：`AZURE_WEBAPP_PUBLISH_PROFILE`
- ❌ 不能是：`AZURE_WEBAPP_PUBLISH_PROFILES` (多了 s)
- ❌ 不能是：`AZURE_PUBLISH_PROFILE`

### 2. 確認 Secret 內容
Secret 值必須是完整的 XML，格式如下：
```xml
<publishData><publishProfile profileName="..." publishMethod="..." ...></publishProfile></publishData>
```

### 3. 確認 Web App 名稱
Workflow 中的 `app-name` 必須與 Azure 中的名稱完全一致：
- 當前使用：`Stay-Our-Safe-backend`
- Azure 實際名稱：`Stay-Our-Safe-backend`

### 4. 替代解決方案

如果還是不行，可以嘗試：

#### 方案 A：使用 Azure CLI 登入
```yaml
- name: 🔐 Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
    
- name: 🚀 Deploy to Azure Web App
  run: |
    az webapp deployment source config-zip \
      --resource-group "2025HSHEastUS2" \
      --name "Stay-Our-Safe-backend" \
      --src "./backend-new/dist.zip"
```

#### 方案 B：使用其他有權限的 Web App
將 `app-name` 改為：`Stay-Our-Safe`

#### 方案 C：手動部署
暫時停用 GitHub Actions，手動部署到 Azure Portal

## 🧪 測試步驟
1. 確認所有設定正確
2. 推送任何更改觸發新的部署
3. 檢查 GitHub Actions 日誌 