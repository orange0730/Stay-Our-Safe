import { Router, Request, Response } from 'express';
import { RiskAssessmentService } from '../modules/generateRisk/riskAssessmentService';
import { ApiResponse, RiskAssessment } from '@shared/types';

const router = Router();
const riskService = new RiskAssessmentService();

/**
 * GET /api/risks/assessment
 * 生成風險評估報告
 */
router.get('/assessment', async (req: Request, res: Response) => {
  try {
    // 取得查詢參數
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 5000;
    
    // 如果提供座標，則評估特定區域
    const center = lat && lng ? { lat, lng } : undefined;
    
    const assessment = await riskService.generateRiskAssessment(center, radius);
    
    const response: ApiResponse<RiskAssessment> = {
      success: true,
      data: assessment,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ASSESSMENT_ERROR',
        message: error.message || '無法生成風險評估'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /api/risks/assessment
 * 為指定區域生成風險評估
 */
router.post('/assessment', async (req: Request, res: Response) => {
  try {
    const { center, radius = 5000 } = req.body;
    
    if (center && (!center.lat || !center.lng)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '中心座標無效'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(400).json(response);
    }
    
    const assessment = await riskService.generateRiskAssessment(center, radius);
    
    const response: ApiResponse<RiskAssessment> = {
      success: true,
      data: assessment,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ASSESSMENT_ERROR',
        message: error.message || '無法生成風險評估'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

export default router; 