# 🔐 Azure GitHub Secrets 設定指南

## ❌ 當前錯誤
```
Error: No credentials found. Add an Azure login action before this action.
```

## 🔧 解決方案：設定 Azure Publish Profile

### 步驟 1：取得 Azure Publish Profile

1. **前往 Azure Portal**
   ```
   https://portal.azure.com
   ```

2. **找到您的 Web App**
   - 搜尋：`Stay-Our-Safe-backend`
   - 或者使用您有權限的其他 Web App

3. **下載 Publish Profile**
   - 點擊 Web App
   - 在頂部工具列點擊 **"Get publish profile"**
   - 下載 `.PublishSettings` 檔案

4. **複製 XML 內容**
   - 用記事本開啟下載的檔案
   - 複製整個 XML 內容

### 步驟 2：在 GitHub 設定 Secret

1. **前往 GitHub Repository**
   ```
   https://github.com/orange0730/Stay-Our-Safe/settings/secrets/actions
   ```

2. **新增 Secret**
   - 點擊 **"New repository secret"**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: 貼上完整的 XML 內容

### 步驟 3：更新 Workflow (如果需要)

如果使用不同的 Web App 名稱，需要更新 `.github/workflows/deploy.yml`：

```yaml
- name: 🚀 Deploy to Azure Web App
  uses: azure/webapps-deploy@v2
  with:
    app-name: '您的實際Web App名稱'  # 例如: Stay-Our-Safe
    publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
    package: './backend-new/dist'
```

## 🎯 可用的 Web Apps

根據之前的檢查，您有權限的 Web Apps：
- `Stay-Our-Safe` (Southeast Asia)
- `Stay-Our-Safe-backend` (Canada Central)
- `hsh2025fs`
- `hsh2025tz`
- 其他...

## 🔄 替代方案：使用有權限的 Web App

如果 `Stay-Our-Safe-backend` 沒有權限，可以改用 `Stay-Our-Safe`：

1. **更新 workflow**
   ```yaml
   app-name: 'Stay-Our-Safe'
   ```

2. **取得該 Web App 的 publish profile**

## 🧪 測試部署

設定完成後：

1. **推送任何更改觸發 Actions**
   ```bash
   git add .
   git commit -m "觸發部署測試"
   git push origin main
   ```

2. **檢查 Actions 結果**
   ```
   https://github.com/orange0730/Stay-Our-Safe/actions
   ```

## 🚨 常見問題

### 問題 1: Publish Profile 無效
- 確認複製了完整的 XML 內容
- 確認沒有額外的空格或換行

### 問題 2: Web App 名稱不符
- 確認 workflow 中的 `app-name` 與實際名稱一致
- 區分大小寫

### 問題 3: 權限不足
- 使用您有完整權限的 Web App
- 檢查 Azure 角色分配

## ✅ 成功標誌

當設定正確時，您會看到：
```
✅ Azure Web App deployment succeeded
```

然後您的後端就會自動部署並運行最新的代碼！ 