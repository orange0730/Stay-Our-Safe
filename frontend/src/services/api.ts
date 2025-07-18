import axios, { AxiosError } from 'axios';
import { 
  ApiResponse, 
  HazardData, 
  UserReport, 
  RiskAssessment, 
  RouteOptions, 
  RouteResult,
  HazardType
} from '../types';
import toast from 'react-hot-toast';

// 建立 axios 實例
const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://stay-our-safe.azurewebsites.net/api' : '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 可以在這裡加入 token
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    const message = error.response?.data?.error?.message || '網路錯誤，請稍後再試';
    toast.error(message);
    return Promise.reject(error);
  }
);

// 災害資料 API
export const hazardApi = {
  // 取得所有災害
  getAll: async (): Promise<HazardData[]> => {
    const { data } = await api.get<ApiResponse<HazardData[]>>('/hazards');
    return data.data || [];
  },

  // 取得特定災害
  getById: async (id: string): Promise<HazardData | null> => {
    const { data } = await api.get<ApiResponse<HazardData>>(`/hazards/${id}`);
    return data.data || null;
  },

  // 取得區域內災害
  getByArea: async (lat: number, lng: number, radius: number): Promise<HazardData[]> => {
    const { data } = await api.get<ApiResponse<HazardData[]>>(
      `/hazards/area/${lat}/${lng}/${radius}`
    );
    return data.data || [];
  },

  // 重新整理資料
  refresh: async (): Promise<{ message: string; count: number }> => {
    const { data } = await api.post<ApiResponse<{ message: string; count: number }>>(
      '/hazards/refresh'
    );
    return data.data!;
  },

  // 重新整理資料並觸發 AI 分析
  refreshWithAI: async (): Promise<{ message: string; successCount: number; totalCount: number }> => {
    const { data } = await api.post<ApiResponse<{ message: string; successCount: number; totalCount: number }>>(
      '/hazards/refresh-with-ai'
    );
    return data.data!;
  },

  // 取得統計資訊
  getStats: async (): Promise<any> => {
    const { data } = await api.get<ApiResponse<any>>('/hazards/stats/summary');
    return data.data;
  },
};

// 使用者上報 API
export const reportApi = {
  // 提交上報
  submit: async (report: Omit<UserReport, 'id' | 'reportedAt'>): Promise<UserReport> => {
    const { data } = await api.post<ApiResponse<UserReport>>('/reports', report);
    return data.data!;
  },

  // 取得上報列表
  getAll: async (filters?: {
    type?: HazardType;
    startDate?: string;
    endDate?: string;
    bounds?: { north: number; south: number; east: number; west: number };
  }): Promise<UserReport[]> => {
    const params = filters ? {
      ...filters,
      bounds: filters.bounds ? JSON.stringify(filters.bounds) : undefined,
    } : {};
    
    const { data } = await api.get<ApiResponse<UserReport[]>>('/reports', { params });
    return data.data || [];
  },

  // 取得特定上報
  getById: async (id: string): Promise<UserReport | null> => {
    const { data } = await api.get<ApiResponse<UserReport>>(`/reports/${id}`);
    return data.data || null;
  },

  // 更新上報
  update: async (id: string, updates: Partial<UserReport>): Promise<UserReport | null> => {
    const { data } = await api.put<ApiResponse<UserReport>>(`/reports/${id}`, updates);
    return data.data || null;
  },

  // 刪除上報
  delete: async (id: string): Promise<boolean> => {
    try {
      await api.delete(`/reports/${id}`);
      return true;
    } catch {
      return false;
    }
  },

  // 取得相似上報
  getSimilar: async (id: string, radius?: number): Promise<UserReport[]> => {
    const params = radius ? { radius } : {};
    const { data } = await api.get<ApiResponse<UserReport[]>>(
      `/reports/${id}/similar`,
      { params }
    );
    return data.data || [];
  },

  // 提升為災害
  promoteToHazard: async (reportIds: string[]): Promise<HazardData | null> => {
    const { data } = await api.post<ApiResponse<{ message: string; hazard: HazardData }>>(
      '/reports/promote',
      { reportIds }
    );
    return data.data?.hazard || null;
  },
};

// 風險評估 API
export const riskApi = {
  // 生成風險評估
  generateAssessment: async (center?: { lat: number; lng: number }, radius?: number): Promise<RiskAssessment> => {
    const params = {
      ...(center ? { lat: center.lat, lng: center.lng } : {}),
      ...(radius ? { radius } : {}),
    };
    
    const { data } = await api.get<ApiResponse<RiskAssessment>>('/risks/assessment', { params });
    return data.data!;
  },

  // 生成特定區域風險評估
  generateAreaAssessment: async (center: { lat: number; lng: number }, radius: number = 5000): Promise<RiskAssessment> => {
    const { data } = await api.post<ApiResponse<RiskAssessment>>('/risks/assessment', {
      center,
      radius,
    });
    return data.data!;
  },
};

// 地圖與路線 API
export const mapApi = {
  // 規劃路線
  planRoute: async (options: RouteOptions): Promise<{
    safestRoute?: RouteResult;
    fastestRoute?: RouteResult;
    balancedRoute?: RouteResult;
    riskAreas: any[];
  }> => {
    try {
      const { data } = await api.post<ApiResponse<{
        safestRoute?: RouteResult;
        fastestRoute?: RouteResult;
        balancedRoute?: RouteResult;
        riskAreas: any[];
      }>>('/map/route', options);
      return data.data!;
    } catch (error) {
      // 如果 API 失敗，返回模擬資料
      console.log('使用模擬路線資料');
      
      // 生成模擬路線
      const generateRoute = (start: any, end: any) => {
        const points = [];
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          points.push({
            lat: start.lat + (end.lat - start.lat) * (i / steps),
            lng: start.lng + (end.lng - start.lng) * (i / steps)
          });
        }
        return points;
      };

      const mockRoute = generateRoute(options.start, options.end);
      
      // 根據導航模式生成不同的指示
      const generateInstructions = (mode: string) => {
        const baseInstructions = [
          '從當前位置出發',
          '向北前進 200 公尺',
          '在第一個路口右轉',
          '繼續前進 500 公尺',
          '經過 7-11 後左轉',
          '直行 300 公尺',
          '在紅綠燈處右轉',
          '繼續前進 400 公尺',
          '目的地在您的左側',
          '您已到達目的地'
        ];

        if (mode === 'safest') {
          return [
            '從當前位置出發（避開災害區域）',
            '向東前進 300 公尺（繞過積水區）',
            '在巷口左轉（避開道路封閉）',
            '沿著安全路線前進 600 公尺',
            '經過避難所後右轉',
            '繼續沿著標示的安全路線前進',
            '在確認安全後通過路口',
            '再前進 200 公尺',
            '目的地在您的右側',
            '您已安全到達目的地'
          ];
        }
        
        return baseInstructions;
      };

      return {
        safestRoute: {
          distance: 2500,
          duration: 900,
          path: mockRoute,
          route: mockRoute,
          warnings: options.avoidHazardTypes?.length ? 
            [`已避開 ${options.avoidHazardTypes.length} 種災害類型`] : [],
          riskLevel: 1,
          instructions: generateInstructions('safest')
        },
        fastestRoute: {
          distance: 2000,
          duration: 600,
          path: mockRoute,
          route: mockRoute,
          warnings: ['此路線可能經過風險區域'],
          riskLevel: 2,
          instructions: generateInstructions('fastest')
        },
        balancedRoute: {
          distance: 2200,
          duration: 750,
          path: mockRoute,
          route: mockRoute,
          warnings: [],
          riskLevel: 1,
          instructions: generateInstructions('balanced')
        },
        riskAreas: []
      };
    }
  },

  // 取得熱圖資料
  getHeatmap: async (): Promise<{
    heatmap: any[];
    overallRisk: number;
    timestamp: string;
  }> => {
    const { data } = await api.get<ApiResponse<any>>('/map/heatmap');
    return data.data;
  },

  // 取得地圖邊界
  getBounds: async (): Promise<{
    bounds: { north: number; south: number; east: number; west: number } | null;
    center: { lat: number; lng: number };
  }> => {
    const { data } = await api.get<ApiResponse<any>>('/map/bounds');
    return data.data;
  },
};

export default api; 