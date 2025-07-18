import { Router, Request, Response } from 'express';
import { RouteOptions, RoutePlanningResult, Coordinates, SeverityLevel } from '../types';
import logger from '../utils/logger';

const router = Router();

// 生成模擬路線的輔助函數
function generateRoute(start: Coordinates, end: Coordinates): Coordinates[] {
  const points: Coordinates[] = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    points.push({
      lat: start.lat + (end.lat - start.lat) * (i / steps),
      lng: start.lng + (end.lng - start.lng) * (i / steps)
    });
  }
  
  return points;
}

// 生成導航指示的輔助函數
function generateInstructions(mode: string): string[] {
  const baseInstructions = [
    '從起點出發',
    '向前直行 200 公尺',
    '在路口右轉',
    '繼續前進 500 公尺',
    '經過便利商店後左轉',
    '直行 300 公尺',
    '在紅綠燈處右轉',
    '繼續前進 400 公尺',
    '目的地在您的左側',
    '您已到達目的地'
  ];

  if (mode === 'safest') {
    return [
      '從起點出發（選擇安全路線）',
      '向東繞行避開積水區域',
      '在巷口左轉避開施工路段',
      '沿著主要道路前進',
      '經過警察局後右轉',
      '繼續沿安全標示路線前進',
      '確認安全後通過路口',
      '再前進 200 公尺',
      '安全到達目的地'
    ];
  }
  
  return baseInstructions;
}

// 計算兩點間距離（公尺）
function calculateDistance(start: Coordinates, end: Coordinates): number {
  const R = 6371000; // 地球半徑（公尺）
  const dLat = (end.lat - start.lat) * Math.PI / 180;
  const dLng = (end.lng - start.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// POST /api/map/route - 路線規劃
router.post('/route', async (req: Request, res: Response) => {
  try {
    const options: RouteOptions = req.body;
    
    logger.info('Route planning request:', options);

    if (!options.start || !options.end) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '起點和終點為必填欄位'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 模擬處理時間
    await new Promise(resolve => setTimeout(resolve, 800));

    const mockRoute = generateRoute(options.start, options.end);
    const distance = calculateDistance(options.start, options.end);

    const result: RoutePlanningResult = {
      safestRoute: {
        distance: Math.round(distance * 1.3), // 安全路線較長
        duration: Math.round(distance * 1.3 / 5), // 假設步行速度 5m/s
        path: mockRoute,
        route: mockRoute,
        warnings: options.avoidHazardTypes?.length ? 
          [`已避開 ${options.avoidHazardTypes.length} 種災害類型`] : [],
        riskLevel: SeverityLevel.LOW,
        instructions: generateInstructions('safest')
      },
      fastestRoute: {
        distance: Math.round(distance),
        duration: Math.round(distance / 6), // 較快速度
        path: mockRoute,
        route: mockRoute,
        warnings: ['此路線可能經過風險區域'],
        riskLevel: SeverityLevel.MEDIUM,
        instructions: generateInstructions('fastest')
      },
      balancedRoute: {
        distance: Math.round(distance * 1.15),
        duration: Math.round(distance * 1.15 / 5.5),
        path: mockRoute,
        route: mockRoute,
        warnings: [],
        riskLevel: SeverityLevel.LOW,
        instructions: generateInstructions('balanced')
      },
      riskAreas: []
    };

    logger.info('Route planning completed successfully');

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Route planning failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '路線規劃失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/map/heatmap - 取得熱圖資料
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    // 模擬熱圖資料
    const heatmapData = {
      heatmap: [
        { lat: 25.0330, lng: 121.5654, intensity: 0.8 },
        { lat: 25.0340, lng: 121.5664, intensity: 0.6 },
        { lat: 25.0350, lng: 121.5674, intensity: 0.4 }
      ],
      overallRisk: 2,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: heatmapData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Heatmap data fetch failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '熱圖資料取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/map/bounds - 取得地圖邊界
router.get('/bounds', async (req: Request, res: Response) => {
  try {
    const boundsData = {
      bounds: {
        north: 25.3,
        south: 24.7,
        east: 122.0,
        west: 121.0
      },
      center: { lat: 25.0330, lng: 121.5654 }
    };

    res.json({
      success: true,
      data: boundsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Map bounds fetch failed:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '地圖邊界取得失敗'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 