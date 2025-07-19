import { Router, Request, Response } from 'express';
import { RouteOptions, RoutePlanningResult, Coordinates, SeverityLevel } from '../types';
import logger from '../utils/logger';
import azureMapsService from '../services/azureMapsService';

const router = Router();

// 生成模擬路線的輔助函數 - 模擬真實道路網格
function generateRoute(start: Coordinates, end: Coordinates): Coordinates[] {
  const points: Coordinates[] = [];
  const steps = 60; // 更多節點讓路線更細緻
  
  // 計算總距離
  const totalDistance = Math.sqrt(Math.pow(end.lat - start.lat, 2) + Math.pow(end.lng - start.lng, 2));
  const latDiff = end.lat - start.lat;
  const lngDiff = end.lng - start.lng;
  
  // 生成基於道路網格的路線點
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    
    // 基本線性插值
    let currentLat = start.lat + latDiff * ratio;
    let currentLng = start.lng + lngDiff * ratio;
    
    // 添加道路轉彎效果 - 模擬真實道路
    if (i > 0 && i < steps) {
      // 主要轉彎點（模擬經過重要路口）
      if (i % 15 === 0) {
        const majorTurn = totalDistance * 0.08 * Math.sin(ratio * Math.PI * 2);
        currentLat += majorTurn * Math.cos(ratio * Math.PI * 3);
        currentLng += majorTurn * Math.sin(ratio * Math.PI * 3);
      }
      
      // 小幅度道路彎曲（模擬道路自然彎曲）
      const roadCurve = totalDistance * 0.02 * Math.sin(ratio * Math.PI * 8);
      const crossRoadVariation = totalDistance * 0.015 * Math.cos(ratio * Math.PI * 6);
      
      currentLat += roadCurve * 0.3;
      currentLng += crossRoadVariation * 0.5;
      
      // 避開障礙物的小繞路
      if (i % 20 === 10) {
        const detour = totalDistance * 0.05 * Math.sin(ratio * Math.PI * 4);
        currentLat += detour * 0.7;
        currentLng += detour * 0.3;
      }
    }
    
    points.push({
      lat: currentLat,
      lng: currentLng
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

// POST /api/map/route - Azure Maps精確路線規劃
router.post('/route', async (req: Request, res: Response) => {
  try {
    const options: RouteOptions = req.body;
    
    logger.info('🗺️ Azure Maps 路線規劃請求:', options);

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

    try {
      logger.info('🎯 使用Azure Maps服務進行路線規劃...');
      
      // 模擬當前災害區域（從AI分析獲取）
      const currentHazards = [
        { lat: 25.0450, lng: 121.5500, radius: 500, type: 'flood' },
        { lat: 25.0520, lng: 121.5650, radius: 300, type: 'fire' }
      ];
      
      // 規劃安全路線（避開災害）
      const safestRoute = await azureMapsService.calculateSafeRoute(
        {
          start: options.start,
          end: options.end,
          travelMode: 'driving',
          routeType: 'fastest',
          avoid: options.avoidHazardTypes?.includes('tollRoads') ? ['tollRoads'] : [],
          traffic: true
        },
        currentHazards
      );
      
      // 規劃快速路線
      const fastestRoute = await azureMapsService.calculateRoute({
        start: options.start,
        end: options.end,
        travelMode: 'driving',
        routeType: 'fastest',
        avoid: ['tollRoads'],
        traffic: true
      });
      
      // 規劃平衡路線
      const balancedRoute = await azureMapsService.calculateRoute({
        start: options.start,
        end: options.end,
        travelMode: 'driving',
        routeType: 'eco',
        traffic: true
      });

      // 轉換為API格式
      const result: RoutePlanningResult = {
        safestRoute: {
          distance: safestRoute.totalDistance,
          duration: safestRoute.totalTime,
          path: safestRoute.coordinates,
          route: safestRoute.coordinates,
          warnings: safestRoute.instructions.filter(inst => inst.includes('避開')),
          riskLevel: SeverityLevel.LOW,
          instructions: safestRoute.instructions,
          precision: 'ultra_high',
          nodeCount: safestRoute.coordinates.length
        },
        fastestRoute: {
          distance: fastestRoute.totalDistance,
          duration: fastestRoute.totalTime,
          path: fastestRoute.coordinates,
          route: fastestRoute.coordinates,
          warnings: ['此路線優先考慮速度，可能經過繁忙路段'],
          riskLevel: SeverityLevel.MEDIUM,
          instructions: fastestRoute.instructions,
          precision: 'ultra_high',
          nodeCount: fastestRoute.coordinates.length
        },
        balancedRoute: {
          distance: balancedRoute.totalDistance,
          duration: balancedRoute.totalTime,
          path: balancedRoute.coordinates,
          route: balancedRoute.coordinates,
          warnings: [],
          riskLevel: SeverityLevel.LOW,
          instructions: balancedRoute.instructions,
          precision: 'ultra_high',
          nodeCount: balancedRoute.coordinates.length
        },
        riskAreas: currentHazards.map(hazard => ({
          lat: hazard.lat,
          lng: hazard.lng,
          radius: hazard.radius,
          type: hazard.type,
          severity: 'medium'
        })),
        precision: 'ultra_high',
        networkStats: azureMapsService.getStatus()
      };

      logger.info(`✅ Azure Maps 路線規劃完成: 
        安全路線: ${safestRoute.totalDistance}m (${safestRoute.coordinates.length}點)
        快速路線: ${fastestRoute.totalDistance}m (${fastestRoute.coordinates.length}點)
        平衡路線: ${balancedRoute.totalDistance}m (${balancedRoute.coordinates.length}點)`);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        source: 'azure-maps'
      });

    } catch (azureError) {
      logger.warn('⚠️ Azure Maps 失敗，使用備用路線算法:', azureError);
      
      // 降級到傳統模擬算法
      const mockRoute = generateRoute(options.start, options.end);
      const distance = calculateDistance(options.start, options.end);

      const result: RoutePlanningResult = {
        safestRoute: {
          distance: Math.round(distance * 1.3),
          duration: Math.round(distance * 1.3 / 5),
          path: mockRoute,
          route: mockRoute,
          warnings: ['使用備用路線算法'],
          riskLevel: SeverityLevel.LOW,
          instructions: generateInstructions('safest'),
          precision: 'approximate'
        },
        fastestRoute: {
          distance: Math.round(distance),
          duration: Math.round(distance / 6),
          path: mockRoute,
          route: mockRoute,
          warnings: ['使用備用路線算法'],
          riskLevel: SeverityLevel.MEDIUM,
          instructions: generateInstructions('fastest'),
          precision: 'approximate'
        },
        balancedRoute: {
          distance: Math.round(distance * 1.15),
          duration: Math.round(distance * 1.15 / 5.5),
          path: mockRoute,
          route: mockRoute,
          warnings: ['使用備用路線算法'],
          riskLevel: SeverityLevel.LOW,
          instructions: generateInstructions('balanced'),
          precision: 'approximate'
        },
        riskAreas: []
      };

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        source: 'fallback'
      });
    }

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