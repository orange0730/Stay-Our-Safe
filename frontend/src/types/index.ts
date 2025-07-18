// 從 shared/types 複製的型別定義
// 這樣可以避免 Vite 處理外部模組的問題

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
  id: string;
  generatedAt: string;
  location: Coordinates;
  radius: number;
  overallRisk: SeverityLevel;
  riskAreas: RiskArea[];
  affectedAreas: {
    id: string;
    polygon: Coordinates[];
    riskLevel: SeverityLevel;
    hazards: HazardData[];
  }[];
  recommendations: string[];
  nearbyHazards: HazardData[];
}

// 風險區域
export interface RiskArea {
  id: string;
  center: Coordinates;
  radius: number;
  riskLevel: SeverityLevel;
  hazardTypes: HazardType[];
  description: string;
}

// 路線選項
export interface RouteOptions {
  start: Coordinates;
  end: Coordinates;
  avoidHazards?: boolean;
  mode?: 'driving' | 'walking';
  preferSafety?: boolean;
  avoidHazardTypes?: string[];
}

// 路線結果
export interface RouteResult {
  distance: number; // 公尺
  duration: number; // 秒
  path: Coordinates[];
  route: Coordinates[];
  warnings: string[];
  riskLevel: SeverityLevel;
  instructions?: string[];
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

// 地圖視圖狀態
export interface MapViewState {
  center: Coordinates;
  zoom: number;
  showHeatmap: boolean;
  showRoutes: boolean;
  selectedHazards: string[];
}

// 應用程式設定
export interface AppSettings {
  notificationEnabled: boolean;
  voiceAlertEnabled: boolean;
  autoRefreshInterval: number; // 秒
  dangerZoneRadius: number; // 公尺
  language: 'zh-TW' | 'en-US';
} 