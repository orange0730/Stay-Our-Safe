import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger';
import autoCrawlService from './services/autoCrawlService';

// Import routes
import mapRoutes from './routes/mapRoutes';
import hazardRoutes from './routes/hazardRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    'https://zealous-plant-02a32bc0f.1.azurestaticapps.net',
    'https://zealous-plant-02a32bc0f-preview.1.azurestaticapps.net',
    'https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin') || 'unknown'}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  logger.info('Health check endpoint accessed');
  res.json({
    message: 'Stay Our Safe Backend API v2.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API routes
app.use('/api/map', mapRoutes);
app.use('/api/hazards', hazardRoutes);

// Alerts/Recent alerts endpoint - 整合自動爬取的AI分析
app.get('/api/alerts/recent', (req, res) => {
  logger.info('Recent alerts endpoint accessed');
  
  try {
    // 獲取自動爬取的AI分析結果
    const analysisHistory = autoCrawlService.getAnalysisHistory(10);
    
    // 將AI分析結果轉換為alerts格式
    const recentAlerts = analysisHistory.flatMap(analysis => 
      analysis.rawData.map(rawData => ({
        id: `alert_${rawData.timestamp}_${rawData.type}`,
        type: rawData.type,
        severity: rawData.severity,
        location: rawData.location,
        description: rawData.description,
        timestamp: rawData.timestamp,
        source: rawData.source,
        status: 'active',
        aiAnalysisId: analysis.id
      }))
    ).slice(0, 20); // 最多20筆

    // AI分析結果
    const recentAssessments = analysisHistory.map(analysis => ({
      id: analysis.id,
      timestamp: analysis.timestamp,
      overallRiskLevel: analysis.overallRiskLevel,
      riskScore: analysis.riskScore,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      dataSource: analysis.dataSource,
      // 保持與現有格式兼容
      location: analysis.dataSource.location,
      overallRisk: analysis.riskScore,
      riskFactors: analysis.dataSource.riskFactors,
      confidence: analysis.dataSource.confidence
    }));

    // 如果沒有真實數據，提供模擬數據
    if (recentAlerts.length === 0) {
      logger.warn('No auto-crawl data available, using mock data');
      
      const mockRecentAlerts = [
        {
          id: `alert_${Date.now()}_1`,
          type: 'flooding',
          severity: 'medium',
          location: { lat: 25.0330, lng: 121.5654, address: '台北市信義區' },
          description: '自動爬取系統正在初始化，暫時顯示模擬數據',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          source: 'system',
          status: 'active'
        }
      ];
      
      const mockRecentAssessments = [
        {
          id: `assessment_${Date.now()}_1`,
          timestamp: new Date().toISOString(),
          overallRiskLevel: '系統啟動中',
          riskScore: 1,
          summary: '自動爬取和AI分析服務正在啟動中，請稍後刷新查看真實數據',
          recommendations: ['系統正在初始化', '請稍後刷新頁面', '等待數據爬取完成'],
          dataSource: {
            location: { lat: 25.0330, lng: 121.5654 },
            confidence: 0.5,
            riskFactors: ['system_startup']
          },
          location: { lat: 25.0330, lng: 121.5654 },
          overallRisk: 1,
          riskFactors: ['system_startup'],
          confidence: 0.5
        }
      ];

      res.json({
        success: true,
        data: {
          recentAlerts: mockRecentAlerts,
          recentAssessments: mockRecentAssessments,
          summary: {
            totalAlerts: mockRecentAlerts.length,
            activeAlerts: mockRecentAlerts.length,
            highSeverityAlerts: 0,
            avgRiskLevel: 1,
            isRealData: false,
            lastCrawl: null,
            crawlStatus: autoCrawlService.getStatus()
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: {
        recentAlerts: recentAlerts,
        recentAssessments: recentAssessments,
        summary: {
          totalAlerts: recentAlerts.length,
          activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
          highSeverityAlerts: recentAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
          avgRiskLevel: recentAssessments.reduce((sum, a) => sum + a.riskScore, 0) / recentAssessments.length,
          isRealData: true,
          lastCrawl: analysisHistory.length > 0 ? analysisHistory[0].timestamp : null,
          crawlStatus: autoCrawlService.getStatus()
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error in alerts/recent endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// 自動爬取服務管理API
app.get('/api/auto-crawl/status', (req, res) => {
  logger.info('Auto-crawl status endpoint accessed');
  try {
    const status = autoCrawlService.getStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting auto-crawl status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/auto-crawl/start', (req, res) => {
  logger.info('Auto-crawl start endpoint accessed');
  try {
    autoCrawlService.start();
    res.json({
      success: true,
      message: '自動爬取服務已啟動',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error starting auto-crawl:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start service',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/auto-crawl/stop', (req, res) => {
  logger.info('Auto-crawl stop endpoint accessed');
  try {
    autoCrawlService.stop();
    res.json({
      success: true,
      message: '自動爬取服務已停止',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error stopping auto-crawl:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop service',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/auto-crawl/history', (req, res) => {
  logger.info('Auto-crawl history endpoint accessed');
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = autoCrawlService.getAnalysisHistory(limit);
    res.json({
      success: true,
      data: {
        analyses: history,
        count: history.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting auto-crawl history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history',
      timestamp: new Date().toISOString()
    });
  }
});

// Reports routes (basic implementation)
app.get('/api/reports', (req, res) => {
  logger.info('Reports endpoint accessed');
  res.json({
    success: true,
    data: [],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/reports', (req, res) => {
  logger.info('Report submission:', req.body);
  res.json({
    success: true,
    data: {
      id: `report_${Date.now()}`,
      message: '上報已成功提交'
    },
    timestamp: new Date().toISOString()
  });
});

// Risk assessment routes (basic implementation)
app.get('/api/risks/assessment', (req, res) => {
  logger.info('Risk assessment endpoint accessed');
  res.json({
    success: true,
    data: {
      id: `assessment_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      location: { lat: 25.0330, lng: 121.5654 },
      radius: 5000,
      overallRisk: 2,
      riskAreas: [
        {
          id: 'area_1',
          center: { lat: 25.0340, lng: 121.5664 },
          radius: 800,
          riskLevel: 2,
          hazardTypes: ['flood'],
          description: '積水風險區域'
        }
      ],
      affectedAreas: [
        {
          id: 'affected_1',
          polygon: [
            { lat: 25.0320, lng: 121.5640 },
            { lat: 25.0350, lng: 121.5640 },
            { lat: 25.0350, lng: 121.5680 },
            { lat: 25.0320, lng: 121.5680 }
          ],
          riskLevel: 2,
          hazards: [
            {
              id: '1',
              type: 'flood',
              severity: 2,
              location: { lat: 25.0335, lng: 121.5660 },
              description: '道路積水',
              source: 'government',
              reportedAt: new Date().toISOString()
            }
          ]
        }
      ],
      recommendations: [
        '避開積水區域',
        '選擇替代路線',
        '注意天氣變化'
      ],
      nearbyHazards: [
        {
          id: '1',
          type: 'flood',
          severity: 2,
          location: { lat: 25.0335, lng: 121.5660 },
          description: '道路積水',
          source: 'government',
          reportedAt: new Date().toISOString()
        }
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `路由不存在: ${req.method} ${req.originalUrl}`
    },
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || '伺服器內部錯誤'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Stay Our Safe Backend v2.0 started successfully`);
  logger.info(`📡 Server running on port ${PORT}`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
  logger.info(`⚡ Ready to serve requests!`);
  
  // 啟動自動爬取服務
  setTimeout(() => {
    logger.info(`🤖 啟動自動爬取和AI分析服務...`);
    autoCrawlService.start();
  }, 3000); // 延遲3秒確保服務器完全啟動
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  autoCrawlService.stop(); // 停止自動爬取服務
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  autoCrawlService.stop(); // 停止自動爬取服務
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app; 