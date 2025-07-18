import { Router, Request, Response } from 'express';
import { HazardData, HazardType, SeverityLevel } from '../types';
import logger from '../utils/logger';

const router = Router();

// 模擬災害資料
const mockHazards: HazardData[] = [
  {
    id: '1',
    type: HazardType.FLOOD,
    severity: SeverityLevel.MEDIUM,
    location: { lat: 25.0330, lng: 121.5654 },
    description: '台北車站周邊積水',
    source: 'government',
    reportedAt: new Date().toISOString(),
    verifiedCount: 5,
    affectedRadius: 200
  },
  {
    id: '2',
    type: HazardType.ROADBLOCK,
    severity: SeverityLevel.HIGH,
    location: { lat: 25.0350, lng: 121.5684 },
    description: '忠孝東路施工封閉',
    source: 'community',
    reportedAt: new Date(Date.now() - 3600000).toISOString(),
    verifiedCount: 12,
    affectedRadius: 500
  },
  {
    id: '3',
    type: HazardType.FIRE,
    severity: SeverityLevel.CRITICAL,
    location: { lat: 25.0370, lng: 121.5714 },
    description: '建築物火災',
    source: 'government',
    reportedAt: new Date(Date.now() - 1800000).toISOString(),
    verifiedCount: 8,
    affectedRadius: 1000
  }
];

// GET /api/hazards - 取得所有災害資料
router.get('/', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all hazards');

    res.json({
      success: true,
      data: mockHazards,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch hazards:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '災害資料取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/hazards/:id - 取得特定災害資料
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const hazard = mockHazards.find(h => h.id === id);

    if (!hazard) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到指定的災害資料'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.json({
      success: true,
      data: hazard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch hazard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '災害資料取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/hazards/area/:lat/:lng/:radius - 取得指定區域的災害資料
router.get('/area/:lat/:lng/:radius', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius } = req.params;
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(centerLat) || isNaN(centerLng) || isNaN(searchRadius)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '無效的座標或半徑參數'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 簡單的距離計算（不是很精確，但足夠用於演示）
    const nearbyHazards = mockHazards.filter(hazard => {
      const distance = Math.sqrt(
        Math.pow(hazard.location.lat - centerLat, 2) +
        Math.pow(hazard.location.lng - centerLng, 2)
      ) * 111000; // 粗略轉換為公尺
      
      return distance <= searchRadius;
    });

    res.json({
      success: true,
      data: nearbyHazards,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch area hazards:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '區域災害資料取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/hazards/refresh - 重新整理災害資料
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    logger.info('Refreshing hazard data');

    // 模擬資料刷新
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      data: {
        message: '災害資料已更新',
        count: mockHazards.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to refresh hazards:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '災害資料更新失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/hazards/refresh-with-ai - 使用 AI 重新整理災害資料
router.post('/refresh-with-ai', async (req: Request, res: Response) => {
  try {
    logger.info('Refreshing hazard data with AI analysis');

    // 模擬 AI 分析
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json({
      success: true,
      data: {
        message: '已使用 AI 分析更新災害資料',
        successCount: mockHazards.length,
        totalCount: mockHazards.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to refresh hazards with AI:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'AI 災害資料分析失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/hazards/stats/summary - 取得災害統計摘要
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = {
      total: mockHazards.length,
      byType: {
        flood: mockHazards.filter(h => h.type === HazardType.FLOOD).length,
        roadblock: mockHazards.filter(h => h.type === HazardType.ROADBLOCK).length,
        fire: mockHazards.filter(h => h.type === HazardType.FIRE).length,
        collapse: mockHazards.filter(h => h.type === HazardType.COLLAPSE).length,
        landslide: mockHazards.filter(h => h.type === HazardType.LANDSLIDE).length,
        other: mockHazards.filter(h => h.type === HazardType.OTHER).length
      },
      bySeverity: {
        low: mockHazards.filter(h => h.severity === SeverityLevel.LOW).length,
        medium: mockHazards.filter(h => h.severity === SeverityLevel.MEDIUM).length,
        high: mockHazards.filter(h => h.severity === SeverityLevel.HIGH).length,
        critical: mockHazards.filter(h => h.severity === SeverityLevel.CRITICAL).length
      },
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch hazard stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '災害統計資料取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 