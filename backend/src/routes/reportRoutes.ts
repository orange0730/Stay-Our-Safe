import { Router, Request, Response } from 'express';
import { ReportService } from '../modules/collectReports/reportService';
import { ApiResponse, UserReport, HazardType } from '@shared/types';

const router = Router();
const reportService = new ReportService();

/**
 * POST /api/reports
 * 提交新的使用者上報
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const reportData = req.body;
    
    // TODO: 實際應用中應該從 auth middleware 取得使用者 ID
    if (!reportData.reporterId) {
      reportData.reporterId = `user_${Date.now()}`;
    }
    
    const report = await reportService.submitReport(reportData);
    
    const response: ApiResponse<UserReport> = {
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'SUBMIT_ERROR',
        message: error.message || '上報失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(400).json(response);
  }
});

/**
 * GET /api/reports
 * 取得使用者上報列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      type: req.query.type as HazardType | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      bounds: req.query.bounds ? JSON.parse(req.query.bounds as string) : undefined
    };
    
    const reports = await reportService.getReports(filters);
    
    const response: ApiResponse<UserReport[]> = {
      success: true,
      data: reports,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得上報資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/reports/:id
 * 取得特定上報詳情
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportService.getReport(id);
    
    if (!report) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到該上報資料'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<UserReport> = {
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得上報資料'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * PUT /api/reports/:id
 * 更新上報資料
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const report = await reportService.updateReport(id, updates);
    
    if (!report) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到該上報資料'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<UserReport> = {
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || '更新失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(400).json(response);
  }
});

/**
 * DELETE /api/reports/:id
 * 刪除上報
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await reportService.deleteReport(id);
    
    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到該上報資料'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: '刪除成功' },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error.message || '刪除失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * POST /api/reports/promote
 * 將多個上報提升為正式災害
 */
router.post('/promote', async (req: Request, res: Response) => {
  try {
    const { reportIds } = req.body;
    
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '請提供要合併的上報 ID 列表'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(400).json(response);
    }
    
    const hazard = await reportService.promoteToHazard(reportIds);
    
    if (!hazard) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'PROMOTE_ERROR',
          message: '無法將上報提升為災害'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(400).json(response);
    }
    
    const response: ApiResponse<any> = {
      success: true,
      data: {
        message: '成功將上報提升為災害',
        hazard
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'PROMOTE_ERROR',
        message: error.message || '提升失敗'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/reports/:id/similar
 * 取得相似的上報
 */
router.get('/:id/similar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : 1000;
    
    const report = await reportService.getReport(id);
    
    if (!report) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '找不到該上報資料'
        },
        timestamp: new Date().toISOString()
      };
      
      return res.status(404).json(response);
    }
    
    const similarReports = await reportService.findSimilarReports(report, radius);
    
    const response: ApiResponse<UserReport[]> = {
      success: true,
      data: similarReports,
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error: any) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error.message || '無法取得相似上報'
      },
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(response);
  }
});

export default router; 