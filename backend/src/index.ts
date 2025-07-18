import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import winston from 'winston';
import path from 'path';

// 載入環境變數
dotenv.config();

// 匯入路由
import hazardRoutes from './routes/hazardRoutes';
import reportRoutes from './routes/reportRoutes';
import riskRoutes from './routes/riskRoutes';
import mapRoutes from './routes/mapRoutes';

// 匯入服務
import { DataFetchService } from './modules/fetchData/dataFetchService';
import { logger } from './services/logger';
import { fetchAndAnalyze } from './services/dataJobs';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// 中間件設定
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 請求日誌中間件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  next();
});

// API 路由
app.use('/api/hazards', hazardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/map', mapRoutes);

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 錯誤處理中間件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '內部伺服器錯誤'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '找不到請求的資源'
    },
    timestamp: new Date().toISOString()
  });
});

// 初始化資料擷取服務
const dataFetchService = new DataFetchService();

// 設定定時任務
if (process.env.DATA_FETCH_INTERVAL) {
  cron.schedule(process.env.DATA_FETCH_INTERVAL, async () => {
    logger.info('執行定時資料擷取...');
    try {
      await dataFetchService.fetchAllData();
      logger.info('資料擷取完成');
    } catch (error) {
      logger.error('資料擷取失敗:', error);
    }
  });
}

// 每 10 分鐘執行一次擷取與分析
cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("Job start:", new Date());
    await fetchAndAnalyze();
    console.log("Job done:", new Date());
  } catch (e) {
    console.error("Job failed:", e);
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  logger.info(`伺服器運行於 http://localhost:${PORT}`);
  logger.info(`環境: ${process.env.NODE_ENV}`);
  
  // 啟動時執行一次資料擷取
  dataFetchService.fetchAllData()
    .then(() => logger.info('初始資料擷取完成'))
    .catch(err => logger.error('初始資料擷取失敗:', err));
});

// 優雅關閉
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信號，準備關閉伺服器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信號，準備關閉伺服器...');
  process.exit(0);
});

export default app; 