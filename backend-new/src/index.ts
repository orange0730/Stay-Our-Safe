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
      riskLevel: 'low',
      assessment: '目前風險等級較低',
      recommendations: ['保持警覺', '注意最新災害資訊']
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