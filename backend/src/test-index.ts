import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

// 基本中間件
app.use(cors());
app.use(express.json());

// 簡單的健康檢查端點
app.get('/', (req, res) => {
  res.json({ 
    message: 'Stay Our Safe Backend is running!',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
});

export default app; 