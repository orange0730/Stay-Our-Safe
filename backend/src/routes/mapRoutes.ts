import { Router, Request, Response } from 'express';
import { RoutePlanningService } from '../modules/mapService/routePlanningService';
import { RiskAssessmentService } from '../modules/generateRisk/riskAssessmentService';
import { ApiResponse, RouteOptions, RouteResult } from '@shared/types';

const router = Router();
const routeService = new RoutePlanningService();
const riskService = new RiskAssessmentService();

/**
 * POST /api/map/route
 * 規劃路線（包含最安全和最快速兩種）
 */
router.post('/route', async (req: Request, res: Response) => {
  try {
    const { start, end, preferSafety } = req.body;
    
    // 驗證參數
    if (!start || !end || !start.lat || !start.lng || !end.lat || !end.lng) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '起點或終點座標無效'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(400).json(response);
    }
    
    // 先取得風險評估以獲得需要避開的區域
    const assessment = await riskService.generateRiskAssessment();
    
    const routeOptions: RouteOptions = {
      start,
      end,
      avoidAreas: assessment.affectedAreas,
      preferSafety
    };
    
    const routes = await routeService.planRoute(routeOptions);
    
    const response: ApiResponse<{
      safestRoute?: RouteResult;
      fastestRoute?: RouteResult;
      riskAreas: any[];
    }> = {
      success: true,
      data: {
        ...routes,
        riskAreas: assessment.affectedAreas
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ROUTE_ERROR',
        message: error.message || '路線規劃失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/map/heatmap
 * 取得熱區資料（用於繪製地圖）
 */
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    // 生成風險評估
    const assessment = await riskService.generateRiskAssessment();
    
    // 轉換為熱圖資料格式
    const heatmapData = assessment.affectedAreas.map(area => ({
      id: area.id,
      center: area.center,
      polygon: area.polygon,
      intensity: area.riskLevel / 4, // 正規化為 0-1
      riskLevel: area.riskLevel,
      hazardCount: area.hazards.length,
      hazardTypes: [...new Set(area.hazards.map(h => h.type))]
    }));
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        heatmap: heatmapData,
        overallRisk: assessment.overallRisk,
        timestamp: assessment.generatedAt
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'HEATMAP_ERROR',
        message: error.message || '無法生成熱區資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/map/bounds
 * 取得所有災害的地圖邊界
 */
router.get('/bounds', async (req: Request, res: Response) => {
  try {
    const assessment = await riskService.generateRiskAssessment();
    
    if (assessment.affectedAreas.length === 0) {
      const response: ApiResponse<any> = {
        success: true,
        data: {
          bounds: null,
          center: { lat: 25.0330, lng: 121.5654 } // 預設台北
        },
        timestamp: new Date().toISOString()
      };
      
      return res.json(response);
    }
    
    // 計算所有區域的邊界
    let north = -90, south = 90, east = -180, west = 180;
    
    assessment.affectedAreas.forEach(area => {
      area.polygon.forEach(point => {
        north = Math.max(north, point.lat);
        south = Math.min(south, point.lat);
        east = Math.max(east, point.lng);
        west = Math.min(west, point.lng);
      });
    });
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        bounds: { north, south, east, west },
        center: {
          lat: (north + south) / 2,
          lng: (east + west) / 2
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'BOUNDS_ERROR',
        message: error.message || '無法計算地圖邊界'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

export default router; 