import { Router, Request, Response } from 'express';
import { DataFetchService } from '../modules/fetchData/dataFetchService';
import { dataStore } from '../services/dataStore';
import { ApiResponse, HazardData } from '@shared/types';

const router = Router();
const dataFetchService = new DataFetchService();

/**
 * GET /api/hazards
 * 取得所有災害資料
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const hazards = dataStore.getHazards();
    
    const response: ApiResponse<HazardData[]> = {
      success: true,
      data: hazards,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得災害資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/hazards/:id
 * 取得特定災害詳情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hazard = dataStore.getHazard(id);
    
    if (!hazard) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到該災害資料'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<HazardData> = {
      success: true,
      data: hazard,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得災害資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /api/hazards/refresh
 * 手動觸發資料更新
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    await dataFetchService.fetchAllData();
    
    const response: ApiResponse<{ message: string; count: number }> = {
      success: true,
      data: {
        message: '資料更新成功',
        count: dataStore.getHazards().length
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || '資料更新失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /api/hazards/refresh-with-ai
 * 觸發 Azure Functions 資料更新和 AI 分析
 */
router.post('/refresh-with-ai', async (req: Request, res: Response) => {
  try {
    // 呼叫 Azure Functions 的資料抓取端點
    const azureFunctionsBaseUrl = process.env.AZURE_FUNCTIONS_URL || 'http://localhost:7072';
    
    // 觸發各個資料源的抓取
    const fetchPromises = [
      fetch(`${azureFunctionsBaseUrl}/api/CWADataFetcher`),
      fetch(`${azureFunctionsBaseUrl}/api/WRADataFetcher`)
    ];
    
    const results = await Promise.all(fetchPromises);
    
    // 檢查結果
    const successCount = results.filter(r => r.ok).length;
    
    // 如果有資料成功抓取，等待一下然後觸發 AI 分析
    if (successCount > 0) {
      setTimeout(async () => {
        try {
          const aiResponse = await fetch(`${azureFunctionsBaseUrl}/api/DataAnalyzer`, {
            method: 'POST'
          });
          
          if (aiResponse.ok) {
            console.log('AI 分析已觸發');
          } else {
            console.error('AI 分析觸發失敗');
          }
        } catch (error) {
          console.error('無法觸發 AI 分析:', error);
        }
      }, 3000); // 等待 3 秒讓資料寫入 Cosmos DB
    }
    
    const response: ApiResponse<{ message: string; successCount: number; totalCount: number }> = {
      success: successCount > 0,
      data: {
        message: `已觸發 ${successCount}/${results.length} 個資料源更新，AI 分析將在稍後執行`,
        successCount,
        totalCount: results.length
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'AZURE_FUNCTIONS_ERROR',
        message: error.message || 'Azure Functions 連接失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/hazards/area/:lat/:lng/:radius
 * 取得特定區域內的災害
 */
router.get('/area/:lat/:lng/:radius', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    const radius = parseFloat(req.params.radius);
    
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '座標或半徑參數無效'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(400).json(response);
    }
    
    const hazards = await dataFetchService.fetchHazardsByArea(
      { lat, lng },
      radius
    );
    
    const response: ApiResponse<HazardData[]> = {
      success: true,
      data: hazards,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得區域災害資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/hazards/stats
 * 取得災害統計資訊
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = dataStore.getStats();
    
    const response: ApiResponse<any> = {
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error.message || '無法取得統計資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

export default router; 