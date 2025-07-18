import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// 中間件
app.use(cors({
  origin: [
    'https://zealous-plant-02a32bc0f.1.azurestaticapps.net',
    'https://zealous-plant-02a32bc0f-preview.1.azurestaticapps.net',
    'http://localhost:3000'
  ],
  credentials: false
}));

app.use(express.json());

// 根路由 - 返回簡單狀態
app.get('/', (req, res) => {
  res.json({
    message: '🌍 Stay Our Safe API is running!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// API 根路由
app.get('/api', (req, res) => {
  res.json({
    message: 'Stay Our Safe API',
    endpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'GET /api/hazards',
      'POST /api/reports'
    ]
  });
});

// 模擬災害數據
app.get('/api/hazards', (req, res) => {
  res.json({
    data: [
      {
        id: 1,
        type: 'earthquake',
        location: { lat: 25.0330, lng: 121.5654 },
        severity: 'medium',
        description: '台北地區輕微地震',
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        type: 'flood',
        location: { lat: 24.1477, lng: 120.6736 },
        severity: 'high',
        description: '台中地區淹水警報',
        timestamp: new Date().toISOString()
      }
    ],
    total: 2,
    status: 'success'
  });
});

// 提交報告
app.post('/api/reports', (req, res) => {
  res.json({
    success: true,
    message: '報告已成功提交',
    reportId: Math.floor(Math.random() * 10000),
    timestamp: new Date().toISOString()
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
});

export default app; 