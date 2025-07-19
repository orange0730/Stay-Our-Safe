// 座標型別
export interface Coordinates {
  lat: number;
  lng: number;
}

// 災害類型
export const HazardType = {
  FLOOD: 'flood',
  ROADBLOCK: 'roadblock',
  COLLAPSE: 'collapse',
  FIRE: 'fire',
  LANDSLIDE: 'landslide',
  OTHER: 'other'
} as const;

export type HazardType = typeof HazardType[keyof typeof HazardType];

// 災害嚴重程度
export const SeverityLevel = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
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
  reportedAt: string;
  verifiedCount?: number;
  affectedRadius?: number;
  images?: string[];
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
  distance: number;
  duration: number;
  path: Coordinates[];
  route: Coordinates[];
  warnings: string[];
  riskLevel: SeverityLevel;
  instructions?: string[];
  precision?: 'ultra_high' | 'meter_level' | 'approximate';
  nodeCount?: number;
}

// 路線規劃結果
export interface RoutePlanningResult {
  safestRoute?: RouteResult;
  fastestRoute?: RouteResult;
  balancedRoute?: RouteResult;
  riskAreas: any[];
  precision?: 'ultra_high' | 'meter_level' | 'approximate';
  networkStats?: any;
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