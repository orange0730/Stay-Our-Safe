import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { HazardData, HazardType, SeverityLevel } from '@shared/types';
import { createLogger } from '../../services/logger';
import { dataStore } from '../../services/dataStore';

const logger = createLogger('DataFetchService');

export class DataFetchService {
  private governmentApiUrl: string;
  private governmentApiKey: string;

  constructor() {
    this.governmentApiUrl = process.env.GOV_API_URL || '';
    this.governmentApiKey = process.env.GOV_API_KEY || '';
  }

  /**
   * 擷取所有資料來源
   */
  async fetchAllData(): Promise<void> {
    try {
      // 並行擷取多個資料來源
      const [govData, mockData] = await Promise.all([
        this.fetchGovernmentData(),
        this.fetchMockData() // 暫時使用 mock 資料
      ]);

      // 合併資料並儲存
      const allHazards = [...govData, ...mockData];
      dataStore.setHazards(allHazards);
      
      logger.info(`成功擷取 ${allHazards.length} 筆災害資料`);
    } catch (error) {
      logger.error('擷取資料失敗:', error);
      throw error;
    }
  }

  /**
   * 從政府 API 擷取資料
   */
  private async fetchGovernmentData(): Promise<HazardData[]> {
    if (!this.governmentApiUrl) {
      logger.warn('未設定政府 API URL，跳過政府資料擷取');
      return [];
    }

    try {
      const response = await axios.get(this.governmentApiUrl, {
        headers: {
          'Authorization': `Bearer ${this.governmentApiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      // 轉換政府資料格式為我們的 HazardData 格式
      return this.transformGovernmentData(response.data);
    } catch (error) {
      logger.error('擷取政府資料失敗:', error);
      return [];
    }
  }

  /**
   * 轉換政府資料格式
   */
  private transformGovernmentData(rawData: any): HazardData[] {
    // 這裡需要根據實際的政府 API 回應格式進行調整
    // 以下是假設的轉換邏輯
    if (!Array.isArray(rawData?.alerts)) {
      return [];
    }

    return rawData.alerts.map((alert: any) => ({
      id: alert.id || uuidv4(),
      type: this.mapAlertType(alert.type),
      severity: this.mapSeverityLevel(alert.severity),
      location: {
        lat: parseFloat(alert.latitude),
        lng: parseFloat(alert.longitude)
      },
      description: alert.description || '',
      source: 'government',
      reportedAt: alert.publishedTime || new Date().toISOString(),
      affectedRadius: alert.affectedRadius || 500
    })).filter((hazard: any) => 
      !isNaN(hazard.location.lat) && !isNaN(hazard.location.lng)
    );
  }

  /**
   * 映射警報類型
   */
  private mapAlertType(type: string): HazardType {
    const typeMap: Record<string, HazardType> = {
      'flood': HazardType.FLOOD,
      'roadblock': HazardType.ROADBLOCK,
      'collapse': HazardType.COLLAPSE,
      'fire': HazardType.FIRE,
      'landslide': HazardType.LANDSLIDE
    };
    return typeMap[type?.toLowerCase()] || HazardType.OTHER;
  }

  /**
   * 映射嚴重程度
   */
  private mapSeverityLevel(severity: string | number): SeverityLevel {
    if (typeof severity === 'number') {
      return Math.min(Math.max(severity, 1), 4) as SeverityLevel;
    }

    const severityMap: Record<string, SeverityLevel> = {
      'low': SeverityLevel.LOW,
      'medium': SeverityLevel.MEDIUM,
      'high': SeverityLevel.HIGH,
      'critical': SeverityLevel.CRITICAL
    };
    return severityMap[severity?.toLowerCase()] || SeverityLevel.MEDIUM;
  }

  /**
   * 產生 Mock 資料（用於開發和測試）
   */
  private async fetchMockData(): Promise<HazardData[]> {
    // 模擬非同步操作
    await new Promise(resolve => setTimeout(resolve, 100));

    // 台灣主要城市座標
    const locations = [
      { name: '台北市', lat: 25.0330, lng: 121.5654 },
      { name: '新北市', lat: 25.0170, lng: 121.4628 },
      { name: '台中市', lat: 24.1477, lng: 120.6736 },
      { name: '台南市', lat: 22.9998, lng: 120.2269 },
      { name: '高雄市', lat: 22.6273, lng: 120.3014 },
      { name: '桃園市', lat: 24.9936, lng: 121.3010 },
      { name: '新竹市', lat: 24.8138, lng: 120.9675 },
      { name: '基隆市', lat: 25.1276, lng: 121.7392 }
    ];

    const hazardTypes = Object.values(HazardType);
    const now = new Date();

    // 產生隨機災害資料
    const mockHazards: HazardData[] = [];
    
    for (let i = 0; i < 10; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
      
      // 根據災害類型調整嚴重程度的機率
      let severity: SeverityLevel;
      const rand = Math.random();
      if (hazardType === HazardType.FLOOD || hazardType === HazardType.COLLAPSE) {
        severity = rand < 0.3 ? SeverityLevel.HIGH : 
                  rand < 0.6 ? SeverityLevel.MEDIUM : 
                  SeverityLevel.LOW;
      } else {
        severity = rand < 0.2 ? SeverityLevel.CRITICAL :
                  rand < 0.5 ? SeverityLevel.HIGH :
                  rand < 0.8 ? SeverityLevel.MEDIUM :
                  SeverityLevel.LOW;
      }

      // 加入一些位置變化
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;

      mockHazards.push({
        id: uuidv4(),
        type: hazardType,
        severity,
        location: {
          lat: location.lat + latOffset,
          lng: location.lng + lngOffset
        },
        description: this.generateMockDescription(hazardType, location.name),
        source: 'government',
        reportedAt: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        affectedRadius: 300 + Math.random() * 1200,
        verifiedCount: Math.floor(Math.random() * 50)
      });
    }

    return mockHazards;
  }

  /**
   * 產生模擬描述
   */
  private generateMockDescription(type: HazardType, locationName: string): string {
    const descriptions: Record<HazardType, string[]> = {
      [HazardType.FLOOD]: [
        `${locationName}地區發生積水，深度約30-50公分`,
        `${locationName}低窪地區淹水，請避免通行`,
        `${locationName}道路積水嚴重，車輛無法通行`
      ],
      [HazardType.ROADBLOCK]: [
        `${locationName}主要道路封閉，請改道`,
        `${locationName}道路施工中，暫時封閉`,
        `${locationName}因事故道路暫時管制`
      ],
      [HazardType.COLLAPSE]: [
        `${locationName}建築物部分倒塌，請勿靠近`,
        `${locationName}邊坡崩塌，道路中斷`,
        `${locationName}橋梁受損，禁止通行`
      ],
      [HazardType.FIRE]: [
        `${locationName}發生火災，消防隊處理中`,
        `${locationName}建築物起火，請遠離現場`,
        `${locationName}工廠火警，煙霧瀰漫`
      ],
      [HazardType.LANDSLIDE]: [
        `${locationName}山區土石流警戒`,
        `${locationName}邊坡不穩，有土石流風險`,
        `${locationName}豪雨導致土石鬆動`
      ],
      [HazardType.OTHER]: [
        `${locationName}發生緊急事件`,
        `${locationName}地區需要注意安全`,
        `${locationName}有潛在危險，請小心`
      ]
    };

    const typeDescriptions = descriptions[type] || descriptions[HazardType.OTHER];
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  /**
   * 取得特定區域的災害資料
   */
  async fetchHazardsByArea(
    center: { lat: number; lng: number },
    radius: number
  ): Promise<HazardData[]> {
    const allHazards = dataStore.getHazards();
    
    // 過濾出指定範圍內的災害
    return allHazards.filter(hazard => {
      const distance = this.calculateDistance(
        center.lat,
        center.lng,
        hazard.location.lat,
        hazard.location.lng
      );
      return distance <= radius;
    });
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
    const R = 6371e3; // 地球半徑（公尺）
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