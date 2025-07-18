// 座標型別
export interface Coordinates {
  lat: number;
  lng: number;
}

// 災害類型
export const HazardType = {
  FLOOD: 'flood',          // 積水
  ROADBLOCK: 'roadblock',  // 封路
  COLLAPSE: 'collapse',    // 倒塌
  FIRE: 'fire',           // 火災
  LANDSLIDE: 'landslide', // 土石流
  OTHER: 'other'          // 其他
} as const;

export type HazardType = typeof HazardType[keyof typeof HazardType];

// 災害嚴重程度
export const SeverityLevel = {
  LOW: 1,      // 低風險
  MEDIUM: 2,   // 中風險
  HIGH: 3,     // 高風險
  CRITICAL: 4  // 極高風險
} as const;

export type SeverityLevel = typeof SeverityLevel[keyof typeof SeverityLevel];

// 災害資料
export interface HazardData {
  id: string;
  type: HazardType;
  severity: SeverityLevel;
  location: Coordinates;
  description: string;
  source: 'government' | 'community';
  reportedAt: string; // ISO 8601 date string
  verifiedCount?: number; // 社群確認次數
  affectedRadius?: number; // 影響半徑（公尺）
  images?: string[]; // 照片 URLs
}

// 使用者上報
export interface UserReport {
  id?: string;
  type: HazardType;
  location: Coordinates;
  description: string;
  reporterId: string;
  reportedAt?: string;
  images?: string[];
}

// 風險評估結果
export interface RiskAssessment {
  overallRisk: SeverityLevel;
  riskDescription: string;
  affectedAreas: RiskArea[];
  recommendations: string[];
  generatedAt: string;
}

// 風險區域
export interface RiskArea {
  id: string;
  polygon: Coordinates[]; // 多邊形座標點
  riskLevel: SeverityLevel;
  hazards: HazardData[];
  center: Coordinates;
}

// 路線規劃選項
export interface RouteOptions {
  start: Coordinates;
  end: Coordinates;
  avoidAreas?: RiskArea[];
  preferSafety?: boolean; // true: 最安全路線, false: 最快速路線
}

// 路線規劃結果
export interface RouteResult {
  route: Coordinates[];
  distance: number; // 公尺
  estimatedTime: number; // 秒
  safetyScore: number; // 0-100
  warnings: string[];
}

// API 回應格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// 推播通知
export interface Notification {
  id: string;
  type: 'warning' | 'alert' | 'info';
  title: string;
  message: string;
  location?: Coordinates;
  hazardId?: string;
  createdAt: string;
}

// 地圖視窗狀態
export interface MapViewState {
  center: Coordinates;
  zoom: number;
  showHeatmap: boolean;
  showRoutes: boolean;
  selectedHazards: string[];
}

// 設定選項
export interface AppSettings {
  notificationEnabled: boolean;
  voiceAlertEnabled: boolean;
  autoRefreshInterval: number; // 秒
  dangerZoneRadius: number; // 公尺
  language: 'zh-TW' | 'en';
} 