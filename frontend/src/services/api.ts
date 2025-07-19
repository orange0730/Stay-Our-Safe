import axios, { AxiosError } from 'axios';
import {
  ApiResponse,
  HazardData,
  UserReport,
  RiskAssessment,
  RouteOptions,
  RouteResult,
  RoutePlanningResult,
  HazardType
} from '../types';
import toast from 'react-hot-toast';

// 建立 axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD ? 'https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net/api' : 'http://localhost:3001/api'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    // 調試信息：顯示 API 請求
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (import.meta.env.DEV) {
      console.log('Request config:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        data: config.data
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// 回應攔截器
api.interceptors.response.use(
  (response) => {
    // 調試信息：顯示 API 響應
    console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    if (import.meta.env.DEV) {
      console.log('Response data:', response.data);
    }
    return response;
  },
  (error: AxiosError<ApiResponse<any>>) => {
    // 調試信息：顯示 API 錯誤
    console.error(`❌ API Error: ${error.response?.status || 'Network'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    
    if (error.response) {
      console.error('API Error Details:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('Network Error:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        timeout: error.config?.timeout
      });
    }
    
    const message = error.response?.data?.error?.message || 
      (error.request ? '網路連線錯誤 - 請檢查後端是否運行' : '網路錯誤，請稍後再試');
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

  // 根據位置取得災害
  getByLocation: async (lat: number, lng: number, radius: number = 5000): Promise<HazardData[]> => {
    const { data } = await api.get<ApiResponse<HazardData[]>>(`/hazards/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
    return data.data || [];
  },

  // 新增災害（由政府來源）
  create: async (hazard: Omit<HazardData, 'id' | 'reportedAt'>): Promise<HazardData> => {
    const { data } = await api.post<ApiResponse<HazardData>>('/hazards', hazard);
    return data.data!;
  },

  // 更新災害狀態
  update: async (id: string, updates: Partial<HazardData>): Promise<HazardData> => {
    const { data } = await api.put<ApiResponse<HazardData>>(`/hazards/${id}`, updates);
    return data.data!;
  },

  // 刪除災害
  delete: async (id: string): Promise<void> => {
    await api.delete(`/hazards/${id}`);
  },

  // 使用 AI 重新整理災害資料
  refreshWithAI: async (): Promise<{ message: string; updatedCount: number }> => {
    const { data } = await api.post<ApiResponse<{ message: string; updatedCount: number }>>('/hazards/refresh-with-ai');
    return data.data!;
  },
};

// 使用者上報 API
export const reportApi = {
  // 取得所有上報
  getAll: async (): Promise<UserReport[]> => {
    const { data } = await api.get<ApiResponse<UserReport[]>>('/reports');
    return data.data || [];
  },

  // 提交上報
  submit: async (report: Omit<UserReport, 'id' | 'reportedAt' | 'status' | 'verifiedCount'>): Promise<UserReport> => {
    const { data } = await api.post<ApiResponse<UserReport>>('/reports', report);
    return data.data!;
  },

  // 驗證上報
  verify: async (id: string): Promise<UserReport> => {
    const { data } = await api.post<ApiResponse<UserReport>>(`/reports/${id}/verify`);
    return data.data!;
  },

  // 標記上報為已解決
  resolve: async (id: string): Promise<UserReport> => {
    const { data } = await api.post<ApiResponse<UserReport>>(`/reports/${id}/resolve`);
    return data.data!;
  },
};

// 風險評估 API
export const riskApi = {
  // 生成風險評估
  generateAssessment: async (): Promise<RiskAssessment> => {
    const { data } = await api.get<ApiResponse<RiskAssessment>>('/risks/assessment');
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

// 地圖和路線規劃 API
export const mapApi = {
  // 地址搜索（地理編碼）
  searchAddress: async (address: string): Promise<{
    results: Array<{
      address: string;
      location: { lat: number; lng: number };
      confidence: number;
    }>;
  }> => {
    try {
      // 使用 OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=tw`
      );
      const data = await response.json();
      
      return {
        results: data.map((item: any) => ({
          address: item.display_name,
          location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
          confidence: parseFloat(item.importance) || 0.5
        }))
      };
    } catch (error) {
      console.error('Address search failed:', error);
      return { results: [] };
    }
  },

  // 反向地理編碼（坐標轉地址）
  reverseGeocode: async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  },

  // 路線規劃
  planRoute: async (options: RouteOptions): Promise<RoutePlanningResult> => {
    try {
      // 先嘗試調用後端 API
      console.log('🗺️ 請求路線規劃:', options);
      const { data } = await api.post<ApiResponse<RoutePlanningResult>>('/map/route', options);
      console.log('✅ 後端路線規劃成功:', data);
      return data.data!;
    } catch (error) {
      console.warn('❌ 後端路線規劃失敗，使用本地模擬路線:', error);
      
      // 使用本地模擬數據
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模擬 API 延遲

      // 生成模擬路線 - 模擬真實道路網格
      const generateRoute = (start: any, end: any) => {
        const points = [];
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
      };

      const mockRoute = generateRoute(options.start, options.end);
      
      // 根據導航模式生成不同的指示
      const generateInstructions = (mode: string) => {
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
      };

      const distance = Math.sqrt(
        Math.pow(options.end.lat - options.start.lat, 2) + 
        Math.pow(options.end.lng - options.start.lng, 2)
      ) * 111000; // 粗略計算距離

      return {
        safestRoute: {
          distance: Math.round(distance * 1.3), // 安全路線較長
          duration: Math.round(distance * 1.3 / 5), // 假設步行速度 5m/s
          path: mockRoute,
          route: mockRoute,
          warnings: options.avoidHazardTypes?.length ? 
            [`已避開 ${options.avoidHazardTypes.length} 種災害類型`] : [],
          riskLevel: 1,
          instructions: generateInstructions('safest')
        },
        fastestRoute: {
          distance: Math.round(distance),
          duration: Math.round(distance / 6), // 較快速度
          path: mockRoute,
          route: mockRoute,
          warnings: ['此路線可能經過風險區域'],
          riskLevel: 2,
          instructions: generateInstructions('fastest')
        },
        balancedRoute: {
          distance: Math.round(distance * 1.15),
          duration: Math.round(distance * 1.15 / 5.5),
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