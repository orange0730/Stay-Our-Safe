import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './utils/logger';

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

// Alerts/Recent alerts endpoint
app.get('/api/alerts/recent', (req, res) => {
  logger.info('Recent alerts endpoint accessed');
  
  // 模擬最近的警報數據
  const recentAlerts = [
    {
      id: `alert_${Date.now()}_1`,
      type: 'flood',
      severity: 'medium',
      location: { lat: 25.0330, lng: 121.5654 },
      description: '台北車站附近積水警報',
      timestamp: new Date(Date.now() - 300000).toISOString(), // 5分鐘前
      source: 'government',
      status: 'active'
    },
    {
      id: `alert_${Date.now()}_2`,
      type: 'roadblock',
      severity: 'high',
      location: { lat: 25.0350, lng: 121.5684 },
      description: '忠孝東路施工封閉',
      timestamp: new Date(Date.now() - 900000).toISOString(), // 15分鐘前
      source: 'traffic',
      status: 'active'
    },
    {
      id: `alert_${Date.now()}_3`,
      type: 'fire',
      severity: 'critical',
      location: { lat: 25.0370, lng: 121.5714 },
      description: '建築物火災警報',
      timestamp: new Date(Date.now() - 1800000).toISOString(), // 30分鐘前
      source: 'emergency',
      status: 'resolved'
    }
  ];

  // 模擬 AI 風險評估數據
  const recentAssessments = [
    {
      id: `assessment_${Date.now()}_1`,
      location: { lat: 25.0330, lng: 121.5654 },
      overallRisk: 3,
      riskFactors: ['flooding', 'traffic'],
      recommendations: ['避開低窪地區', '選擇替代路線'],
      confidence: 0.85,
      timestamp: new Date().toISOString()
    },
    {
      id: `assessment_${Date.now()}_2`,
      location: { lat: 25.0350, lng: 121.5684 },
      overallRisk: 2,
      riskFactors: ['construction', 'traffic'],
      recommendations: ['使用大眾運輸', '提前規劃路線'],
      confidence: 0.92,
      timestamp: new Date(Date.now() - 600000).toISOString() // 10分鐘前
    }
  ];

  res.json({
    success: true,
    data: {
      recentAlerts,
      recentAssessments,
      summary: {
        totalAlerts: recentAlerts.length,
        activeAlerts: recentAlerts.filter(a => a.status === 'active').length,
        highSeverityAlerts: recentAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length,
        avgRiskLevel: recentAssessments.reduce((sum, a) => sum + a.overallRisk, 0) / recentAssessments.length
      }
    },
    timestamp: new Date().toISOString()
  });
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
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app; 