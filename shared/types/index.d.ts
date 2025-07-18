export interface Coordinates {
    lat: number;
    lng: number;
}
export declare enum HazardType {
    FLOOD = "flood",// 積水
    ROADBLOCK = "roadblock",// 封路
    COLLAPSE = "collapse",// 倒塌
    FIRE = "fire",// 火災
    LANDSLIDE = "landslide",// 土石流
    OTHER = "other"
}
export declare enum SeverityLevel {
    LOW = 1,// 低風險
    MEDIUM = 2,// 中風險
    HIGH = 3,// 高風險
    CRITICAL = 4
}
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
export interface UserReport {
    id?: string;
    type: HazardType;
    location: Coordinates;
    description: string;
    reporterId: string;
    reportedAt?: string;
    images?: string[];
}
export interface RiskAssessment {
    overallRisk: SeverityLevel;
    riskDescription: string;
    affectedAreas: RiskArea[];
    recommendations: string[];
    generatedAt: string;
}
export interface RiskArea {
    id: string;
    polygon: Coordinates[];
    riskLevel: SeverityLevel;
    hazards: HazardData[];
    center: Coordinates;
}
export interface RouteOptions {
    start: Coordinates;
    end: Coordinates;
    avoidAreas?: RiskArea[];
    preferSafety?: boolean;
}
export interface RouteResult {
    route: Coordinates[];
    distance: number;
    estimatedTime: number;
    safetyScore: number;
    warnings: string[];
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    timestamp: string;
}
export interface Notification {
    id: string;
    type: 'warning' | 'alert' | 'info';
    title: string;
    message: string;
    location?: Coordinates;
    hazardId?: string;
    createdAt: string;
}
export interface MapViewState {
    center: Coordinates;
    zoom: number;
    showHeatmap: boolean;
    showRoutes: boolean;
    selectedHazards: string[];
}
export interface AppSettings {
    notificationEnabled: boolean;
    voiceAlertEnabled: boolean;
    autoRefreshInterval: number;
    dangerZoneRadius: number;
    language: 'zh-TW' | 'en';
}
//# sourceMappingURL=index.d.ts.map