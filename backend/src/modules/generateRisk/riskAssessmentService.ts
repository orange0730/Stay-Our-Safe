import { HazardData, RiskAssessment, RiskArea, SeverityLevel, Coordinates } from '@shared/types';
import { dataStore } from '../../services/dataStore';
import { createLogger } from '../../services/logger';
import { OpenAI } from 'openai';

const logger = createLogger('RiskAssessmentService');

export class RiskAssessmentService {
  private openai: OpenAI | null = null;

  constructor() {
    // 檢查是否使用 Azure OpenAI
    if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
      });
    } else if (process.env.OPENAI_API_KEY) {
      // 使用標準 OpenAI API
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * 生成完整的風險評估報告
   */
  async generateRiskAssessment(
    center?: Coordinates,
    radius: number = 5000
  ): Promise<RiskAssessment> {
    try {
      // 取得所有災害資料
      let hazards = dataStore.getHazards();

      // 如果指定中心點，則只評估該區域
      if (center) {
        hazards = hazards.filter(hazard => {
          const distance = this.calculateDistance(
            center.lat,
            center.lng,
            hazard.location.lat,
            hazard.location.lng
          );
          return distance <= radius;
        });
      }

      // 產生風險區域
      const riskAreas = this.generateRiskAreas(hazards);

      // 計算整體風險等級
      const overallRisk = this.calculateOverallRisk(riskAreas);

      // 使用 AI 生成風險描述和建議
      const { description, recommendations } = await this.generateAIAssessment(
        hazards,
        riskAreas,
        overallRisk
      );

      const assessment: RiskAssessment = {
        overallRisk,
        riskDescription: description,
        affectedAreas: riskAreas,
        recommendations,
        generatedAt: new Date().toISOString()
      };

      logger.info('風險評估完成', {
        overallRisk,
        areaCount: riskAreas.length,
        hazardCount: hazards.length
      });

      return assessment;
    } catch (error) {
      logger.error('生成風險評估失敗:', error);
      throw error;
    }
  }

  /**
   * 產生風險區域（將鄰近的災害群組化）
   */
  private generateRiskAreas(hazards: HazardData[]): RiskArea[] {
    const riskAreas: RiskArea[] = [];
    const processedHazards = new Set<string>();

    hazards.forEach(hazard => {
      if (processedHazards.has(hazard.id)) return;

      // 找出附近的災害
      const nearbyHazards = hazards.filter(h => {
        if (h.id === hazard.id) return true;
        if (processedHazards.has(h.id)) return false;

        const distance = this.calculateDistance(
          hazard.location.lat,
          hazard.location.lng,
          h.location.lat,
          h.location.lng
        );

        // 根據影響範圍決定是否屬於同一風險區域
        const maxRadius = Math.max(
          hazard.affectedRadius || 500,
          h.affectedRadius || 500
        );
        return distance <= maxRadius * 1.5;
      });

      // 標記已處理的災害
      nearbyHazards.forEach(h => processedHazards.add(h.id));

      // 計算風險區域的中心和邊界
      const bounds = this.calculateBounds(nearbyHazards);
      const center = this.calculateCenter(bounds);

      // 產生多邊形（簡化為矩形）
      const polygon = this.generatePolygon(bounds, nearbyHazards);

      // 計算風險等級（取最高的）
      const riskLevel = Math.max(
        ...nearbyHazards.map(h => h.severity)
      ) as SeverityLevel;

      riskAreas.push({
        id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        polygon,
        riskLevel,
        hazards: nearbyHazards,
        center
      });
    });

    return riskAreas;
  }

  /**
   * 計算整體風險等級
   */
  private calculateOverallRisk(riskAreas: RiskArea[]): SeverityLevel {
    if (riskAreas.length === 0) return SeverityLevel.LOW;

    // 考慮最高風險和風險區域數量
    const maxRisk = Math.max(...riskAreas.map(area => area.riskLevel));
    const criticalCount = riskAreas.filter(area => area.riskLevel === SeverityLevel.CRITICAL).length;
    const highCount = riskAreas.filter(area => area.riskLevel === SeverityLevel.HIGH).length;

    if (criticalCount >= 2 || (criticalCount >= 1 && highCount >= 3)) {
      return SeverityLevel.CRITICAL;
    }
    if (highCount >= 2 || (highCount >= 1 && riskAreas.length >= 5)) {
      return SeverityLevel.HIGH;
    }
    if (maxRisk >= SeverityLevel.MEDIUM || riskAreas.length >= 3) {
      return SeverityLevel.MEDIUM;
    }

    return SeverityLevel.LOW;
  }

  /**
   * 使用 AI 生成風險描述和建議
   */
  private async generateAIAssessment(
    hazards: HazardData[],
    riskAreas: RiskArea[],
    overallRisk: SeverityLevel
  ): Promise<{ description: string; recommendations: string[] }> {
    // 如果沒有設定 OpenAI API，使用預設模板
    if (!this.openai) {
      return this.generateTemplateAssessment(hazards, riskAreas, overallRisk);
    }

    try {
      // 準備 AI 輸入資料
      const hazardSummary = this.summarizeHazards(hazards);
      const areaSummary = this.summarizeRiskAreas(riskAreas);

      const prompt = `
作為災害防護專家，請根據以下資訊生成風險評估：

整體風險等級：${this.getRiskLevelText(overallRisk)}
風險區域數量：${riskAreas.length}
災害總數：${hazards.length}

災害摘要：
${hazardSummary}

風險區域摘要：
${areaSummary}

請提供：
1. 一段簡潔的整體風險描述（約50-100字）
2. 3-5個具體的安全建議

請用繁體中文回覆，語氣專業但易懂。
`;

      const completion = await this.openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一位專業的災害防護專家，擅長分析災害風險並提供實用的安全建議。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // 解析 AI 回應
      const lines = response.split('\n').filter(line => line.trim());
      const description = lines.find(line => !line.match(/^\d+\./))?.trim() || 
        this.generateDefaultDescription(overallRisk, hazards.length);
      
      const recommendations = lines
        .filter(line => line.match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(rec => rec.length > 0);

      // 如果建議太少，補充預設建議
      if (recommendations.length < 3) {
        recommendations.push(...this.getDefaultRecommendations(overallRisk).slice(0, 3 - recommendations.length));
      }

      return { description, recommendations };
    } catch (error) {
      logger.error('AI 評估失敗，使用預設模板:', error);
      return this.generateTemplateAssessment(hazards, riskAreas, overallRisk);
    }
  }

  /**
   * 生成預設的風險評估（當 AI 不可用時）
   */
  private generateTemplateAssessment(
    hazards: HazardData[],
    riskAreas: RiskArea[],
    overallRisk: SeverityLevel
  ): { description: string; recommendations: string[] } {
    const description = this.generateDefaultDescription(overallRisk, hazards.length);
    const recommendations = this.getDefaultRecommendations(overallRisk);
    
    return { description, recommendations };
  }

  /**
   * 生成預設風險描述
   */
  private generateDefaultDescription(risk: SeverityLevel, hazardCount: number): string {
    const templates: Record<SeverityLevel, string> = {
      [SeverityLevel.CRITICAL]: `目前區域內有 ${hazardCount} 個災害點，整體風險極高。多處發生嚴重災害事件，對民眾生命財產構成重大威脅，請立即採取緊急應變措施。`,
      [SeverityLevel.HIGH]: `目前區域內有 ${hazardCount} 個災害點，整體風險偏高。部分地區出現嚴重災害狀況，建議民眾提高警覺，避免前往危險區域。`,
      [SeverityLevel.MEDIUM]: `目前區域內有 ${hazardCount} 個災害點，整體風險中等。局部地區有災害發生，請民眾注意安全，隨時關注最新資訊。`,
      [SeverityLevel.LOW]: `目前區域內有 ${hazardCount} 個災害點，整體風險較低。雖有零星災害事件，但影響範圍有限，請保持正常警覺即可。`
    };
    
    return templates[risk];
  }

  /**
   * 取得預設建議
   */
  private getDefaultRecommendations(risk: SeverityLevel): string[] {
    const recommendations: Record<SeverityLevel, string[]> = {
      [SeverityLevel.CRITICAL]: [
        '立即撤離危險區域，前往指定避難所',
        '準備緊急避難包，包含飲水、食物、手電筒、醫藥品',
        '關注官方疏散指示，配合相關單位引導',
        '確認家人安全，保持通訊暢通',
        '避免接近河川、山坡地等高風險區域'
      ],
      [SeverityLevel.HIGH]: [
        '避免非必要外出，特別是前往災害發生區域',
        '隨時關注氣象和災害警報資訊',
        '檢查居家環境，加固門窗並清理排水溝',
        '準備充足的民生物資和緊急用品',
        '了解最近的避難所位置和疏散路線'
      ],
      [SeverityLevel.MEDIUM]: [
        '提高警覺，留意周遭環境變化',
        '避免前往山區、河邊等易發生災害的地點',
        '確保手機電量充足，隨時接收警報訊息',
        '預先規劃替代路線，避開可能受影響的道路',
        '與家人保持聯繫，確認彼此安全'
      ],
      [SeverityLevel.LOW]: [
        '保持正常作息，但需留意天氣變化',
        '關注新聞和官方公告，掌握最新資訊',
        '確認緊急聯絡方式和避難路線',
        '適度準備民生必需品',
        '協助關心身邊年長者和行動不便者'
      ]
    };
    
    return recommendations[risk];
  }

  /**
   * 摘要災害資訊
   */
  private summarizeHazards(hazards: HazardData[]): string {
    const typeCount = new Map<string, number>();
    hazards.forEach(h => {
      const count = typeCount.get(h.type) || 0;
      typeCount.set(h.type, count + 1);
    });

    const summary: string[] = [];
    typeCount.forEach((count, type) => {
      summary.push(`${this.getHazardTypeText(type)}：${count} 處`);
    });

    return summary.join('、');
  }

  /**
   * 摘要風險區域
   */
  private summarizeRiskAreas(areas: RiskArea[]): string {
    const severityCount = new Map<SeverityLevel, number>();
    areas.forEach(area => {
      const count = severityCount.get(area.riskLevel) || 0;
      severityCount.set(area.riskLevel, count + 1);
    });

    const summary: string[] = [];
    severityCount.forEach((count, level) => {
      summary.push(`${this.getRiskLevelText(level)}風險區域：${count} 個`);
    });

    return summary.join('、');
  }

  /**
   * 計算邊界
   */
  private calculateBounds(hazards: HazardData[]): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const lats = hazards.map(h => h.location.lat);
    const lngs = hazards.map(h => h.location.lng);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  }

  /**
   * 計算中心點
   */
  private calculateCenter(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Coordinates {
    return {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2
    };
  }

  /**
   * 產生多邊形（包含緩衝區）
   */
  private generatePolygon(
    bounds: { north: number; south: number; east: number; west: number },
    hazards: HazardData[]
  ): Coordinates[] {
    // 計算緩衝距離（根據災害影響範圍）
    const maxRadius = Math.max(...hazards.map(h => h.affectedRadius || 500));
    const bufferLat = (maxRadius / 111000); // 緯度方向的度數
    const bufferLng = (maxRadius / (111000 * Math.cos(bounds.north * Math.PI / 180))); // 經度方向的度數

    // 產生包含緩衝區的矩形
    return [
      { lat: bounds.north + bufferLat, lng: bounds.west - bufferLng },
      { lat: bounds.north + bufferLat, lng: bounds.east + bufferLng },
      { lat: bounds.south - bufferLat, lng: bounds.east + bufferLng },
      { lat: bounds.south - bufferLat, lng: bounds.west - bufferLng },
      { lat: bounds.north + bufferLat, lng: bounds.west - bufferLng } // 閉合多邊形
    ];
  }

  /**
   * 取得風險等級文字
   */
  private getRiskLevelText(level: SeverityLevel): string {
    const texts: Record<SeverityLevel, string> = {
      [SeverityLevel.CRITICAL]: '極高',
      [SeverityLevel.HIGH]: '高',
      [SeverityLevel.MEDIUM]: '中',
      [SeverityLevel.LOW]: '低'
    };
    return texts[level];
  }

  /**
   * 取得災害類型文字
   */
  private getHazardTypeText(type: string): string {
    const texts: Record<string, string> = {
      'flood': '積水',
      'roadblock': '道路封閉',
      'collapse': '建築倒塌',
      'fire': '火災',
      'landslide': '土石流',
      'other': '其他災害'
    };
    return texts[type] || type;
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