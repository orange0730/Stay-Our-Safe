import { Coordinates, RouteOptions, RouteResult, RiskArea, SeverityLevel } from '@shared/types';
import { createLogger } from '../../services/logger';
import axios from 'axios';

const logger = createLogger('RoutePlanningService');

export class RoutePlanningService {
  private mapboxApiKey: string;

  constructor() {
    this.mapboxApiKey = process.env.MAPBOX_API_KEY || '';
  }

  /**
   * 規劃路線（包含最安全和最快速兩種選項）
   */
  async planRoute(options: RouteOptions): Promise<{
    safestRoute?: RouteResult;
    fastestRoute?: RouteResult;
  }> {
    try {
      // 並行計算兩種路線
      const [safestRoute, fastestRoute] = await Promise.all([
        this.planSafestRoute(options),
        this.planFastestRoute(options)
      ]);

      return {
        safestRoute,
        fastestRoute
      };
    } catch (error) {
      logger.error('路線規劃失敗:', error);
      throw error;
    }
  }

  /**
   * 規劃最安全的路線（避開所有高風險區域）
   */
  private async planSafestRoute(options: RouteOptions): Promise<RouteResult | undefined> {
    try {
      // 如果沒有 Mapbox API key，使用模擬路線
      if (!this.mapboxApiKey) {
        return this.generateMockRoute(options, true);
      }

      // 計算需要避開的點
      const avoidPoints = this.getAvoidancePoints(options.avoidAreas || [], [
        SeverityLevel.CRITICAL,
        SeverityLevel.HIGH,
        SeverityLevel.MEDIUM
      ]);

      // 呼叫 Mapbox Directions API
      const route = await this.callMapboxAPI(
        options.start,
        options.end,
        avoidPoints,
        'walking' // 步行通常更安全
      );

      if (!route) {
        return undefined;
      }

      // 評估路線安全性
      const safetyScore = this.calculateSafetyScore(
        route.route,
        options.avoidAreas || []
      );

      // 生成警告訊息
      const warnings = this.generateWarnings(
        route.route,
        options.avoidAreas || [],
        true
      );

      return {
        ...route,
        safetyScore,
        warnings
      };
    } catch (error) {
      logger.error('規劃安全路線失敗:', error);
      return this.generateMockRoute(options, true);
    }
  }

  /**
   * 規劃最快速的路線（只避開極高風險區域）
   */
  private async planFastestRoute(options: RouteOptions): Promise<RouteResult | undefined> {
    try {
      // 如果沒有 Mapbox API key，使用模擬路線
      if (!this.mapboxApiKey) {
        return this.generateMockRoute(options, false);
      }

      // 只避開極高風險區域
      const avoidPoints = this.getAvoidancePoints(options.avoidAreas || [], [
        SeverityLevel.CRITICAL
      ]);

      // 呼叫 Mapbox Directions API
      const route = await this.callMapboxAPI(
        options.start,
        options.end,
        avoidPoints,
        'driving' // 開車通常更快
      );

      if (!route) {
        return undefined;
      }

      // 評估路線安全性
      const safetyScore = this.calculateSafetyScore(
        route.route,
        options.avoidAreas || []
      );

      // 生成警告訊息
      const warnings = this.generateWarnings(
        route.route,
        options.avoidAreas || [],
        false
      );

      return {
        ...route,
        safetyScore,
        warnings
      };
    } catch (error) {
      logger.error('規劃快速路線失敗:', error);
      return this.generateMockRoute(options, false);
    }
  }

  /**
   * 呼叫 Mapbox API
   */
  private async callMapboxAPI(
    start: Coordinates,
    end: Coordinates,
    avoidPoints: Coordinates[],
    profile: 'driving' | 'walking' | 'cycling'
  ): Promise<Omit<RouteResult, 'safetyScore' | 'warnings'> | undefined> {
    try {
      // 建構 API URL
      const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;

      // 建構查詢參數
      const params: any = {
        access_token: this.mapboxApiKey,
        geometries: 'geojson',
        overview: 'full',
        steps: true,
        alternatives: true
      };

      // 加入避開點（使用 exclude 參數）
      if (avoidPoints.length > 0) {
        // Mapbox 不直接支援避開特定點，需要使用其他策略
        // 這裡簡化處理，實際應用可能需要更複雜的邏輯
        params.exclude = 'toll,motorway,ferry';
      }

      const response = await axios.get(url, { params });

      if (!response.data.routes || response.data.routes.length === 0) {
        return undefined;
      }

      const route = response.data.routes[0];
      const routeCoordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0]
      }));

      return {
        route: routeCoordinates,
        distance: route.distance,
        estimatedTime: route.duration
      };
    } catch (error) {
      logger.error('Mapbox API 呼叫失敗:', error);
      return undefined;
    }
  }

  /**
   * 生成模擬路線
   */
  private generateMockRoute(
    options: RouteOptions,
    preferSafety: boolean
  ): RouteResult {
    const { start, end, avoidAreas = [] } = options;

    // 計算直線距離
    const directDistance = this.calculateDistance(
      start.lat,
      start.lng,
      end.lat,
      end.lng
    );

    // 生成路線點
    const routePoints: Coordinates[] = [];
    const steps = 20; // 路線點數量

    if (preferSafety && avoidAreas.length > 0) {
      // 安全路線：繞過危險區域
      routePoints.push(start);

      // 找出需要繞過的區域
      const criticalAreas = avoidAreas.filter(
        area => area.riskLevel >= SeverityLevel.HIGH
      );

      if (criticalAreas.length > 0) {
        // 計算繞行點
        const detourPoint = this.calculateDetourPoint(
          start,
          end,
          criticalAreas[0].center
        );
        routePoints.push(detourPoint);
      }

      // 添加中間點
      for (let i = 1; i < steps - 1; i++) {
        const ratio = i / (steps - 1);
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;

        // 檢查是否在危險區域內，如果是則偏移
        const adjustedPoint = this.adjustPointIfInDanger(
          { lat, lng },
          avoidAreas
        );
        routePoints.push(adjustedPoint);
      }

      routePoints.push(end);
    } else {
      // 快速路線：直線連接
      for (let i = 0; i < steps; i++) {
        const ratio = i / (steps - 1);
        routePoints.push({
          lat: start.lat + (end.lat - start.lat) * ratio,
          lng: start.lng + (end.lng - start.lng) * ratio
        });
      }
    }

    // 計算路線距離（簡化計算）
    let totalDistance = 0;
    for (let i = 1; i < routePoints.length; i++) {
      totalDistance += this.calculateDistance(
        routePoints[i - 1].lat,
        routePoints[i - 1].lng,
        routePoints[i].lat,
        routePoints[i].lng
      );
    }

    // 估算時間（假設步行速度 5km/h，開車 40km/h）
    const speed = preferSafety ? 5 : 40;
    const estimatedTime = (totalDistance / 1000 / speed) * 3600; // 秒

    // 計算安全分數
    const safetyScore = this.calculateSafetyScore(routePoints, avoidAreas);

    // 生成警告
    const warnings = this.generateWarnings(routePoints, avoidAreas, preferSafety);

    return {
      route: routePoints,
      distance: Math.round(totalDistance),
      estimatedTime: Math.round(estimatedTime),
      safetyScore,
      warnings
    };
  }

  /**
   * 計算繞行點
   */
  private calculateDetourPoint(
    start: Coordinates,
    end: Coordinates,
    danger: Coordinates
  ): Coordinates {
    // 計算垂直於起終點連線的方向
    const dx = end.lng - start.lng;
    const dy = end.lat - start.lat;
    
    // 垂直向量
    const perpX = -dy;
    const perpY = dx;
    
    // 標準化
    const length = Math.sqrt(perpX * perpX + perpY * perpY);
    const normalX = perpX / length;
    const normalY = perpY / length;
    
    // 繞行距離（度）
    const detourDistance = 0.01;
    
    // 計算中點
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;
    
    // 決定繞行方向（遠離危險點）
    const toDangerX = danger.lng - midLng;
    const toDangerY = danger.lat - midLat;
    const dotProduct = toDangerX * normalX + toDangerY * normalY;
    const direction = dotProduct > 0 ? -1 : 1;
    
    return {
      lat: midLat + normalY * detourDistance * direction,
      lng: midLng + normalX * detourDistance * direction
    };
  }

  /**
   * 調整點位置以避開危險區域
   */
  private adjustPointIfInDanger(
    point: Coordinates,
    avoidAreas: RiskArea[]
  ): Coordinates {
    for (const area of avoidAreas) {
      if (area.riskLevel < SeverityLevel.HIGH) continue;

      // 簡化判斷：檢查是否在區域中心附近
      const distance = this.calculateDistance(
        point.lat,
        point.lng,
        area.center.lat,
        area.center.lng
      );

      const dangerRadius = this.getAreaRadius(area);
      if (distance < dangerRadius) {
        // 將點移出危險區域
        const angle = Math.atan2(
          point.lat - area.center.lat,
          point.lng - area.center.lng
        );
        
        const newDistance = dangerRadius * 1.2; // 移到安全距離
        return {
          lat: area.center.lat + Math.sin(angle) * newDistance / 111000,
          lng: area.center.lng + Math.cos(angle) * newDistance / 111000
        };
      }
    }

    return point;
  }

  /**
   * 取得避開點
   */
  private getAvoidancePoints(
    avoidAreas: RiskArea[],
    severityLevels: SeverityLevel[]
  ): Coordinates[] {
    return avoidAreas
      .filter(area => severityLevels.includes(area.riskLevel))
      .map(area => area.center);
  }

  /**
   * 計算路線安全分數（0-100）
   */
  private calculateSafetyScore(
    route: Coordinates[],
    avoidAreas: RiskArea[]
  ): number {
    if (avoidAreas.length === 0) return 100;

    let dangerPoints = 0;
    const checkInterval = Math.max(1, Math.floor(route.length / 50)); // 抽樣檢查

    for (let i = 0; i < route.length; i += checkInterval) {
      const point = route[i];
      
      for (const area of avoidAreas) {
        const distance = this.calculateDistance(
          point.lat,
          point.lng,
          area.center.lat,
          area.center.lng
        );

        const dangerRadius = this.getAreaRadius(area);
        if (distance < dangerRadius) {
          // 根據風險等級扣分
          dangerPoints += area.riskLevel;
        }
      }
    }

    // 計算分數
    const maxDanger = route.length / checkInterval * SeverityLevel.CRITICAL;
    const safetyRatio = 1 - (dangerPoints / maxDanger);
    return Math.round(Math.max(0, Math.min(100, safetyRatio * 100)));
  }

  /**
   * 生成路線警告
   */
  private generateWarnings(
    route: Coordinates[],
    avoidAreas: RiskArea[],
    preferSafety: boolean
  ): string[] {
    const warnings: string[] = [];
    const passedAreas = new Set<string>();

    // 檢查路線經過的危險區域
    for (const point of route) {
      for (const area of avoidAreas) {
        if (passedAreas.has(area.id)) continue;

        const distance = this.calculateDistance(
          point.lat,
          point.lng,
          area.center.lat,
          area.center.lng
        );

        const dangerRadius = this.getAreaRadius(area);
        if (distance < dangerRadius * 1.5) {
          passedAreas.add(area.id);

          // 根據風險等級生成警告
          const hazardTypes = [...new Set(area.hazards.map(h => h.type))];
          const hazardText = hazardTypes.join('、');

          if (area.riskLevel === SeverityLevel.CRITICAL) {
            warnings.push(`⚠️ 路線經過極高風險區域（${hazardText}），請特別小心！`);
          } else if (area.riskLevel === SeverityLevel.HIGH) {
            warnings.push(`⚠️ 路線經過高風險區域（${hazardText}），建議繞道。`);
          } else if (area.riskLevel === SeverityLevel.MEDIUM && preferSafety) {
            warnings.push(`ℹ️ 路線附近有中度風險區域（${hazardText}）。`);
          }
        }
      }
    }

    // 加入一般性建議
    if (warnings.length === 0) {
      warnings.push('✅ 路線相對安全，但請隨時注意周遭環境。');
    } else {
      warnings.push('📱 請保持手機暢通，隨時接收最新警報。');
    }

    return warnings;
  }

  /**
   * 取得區域半徑
   */
  private getAreaRadius(area: RiskArea): number {
    // 根據多邊形計算大概的半徑
    if (area.polygon.length < 2) return 500;

    let maxDistance = 0;
    for (let i = 0; i < area.polygon.length; i++) {
      const distance = this.calculateDistance(
        area.center.lat,
        area.center.lng,
        area.polygon[i].lat,
        area.polygon[i].lng
      );
      maxDistance = Math.max(maxDistance, distance);
    }

    return maxDistance;
  }

  /**
   * 計算兩點間的距離（公尺）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
} 