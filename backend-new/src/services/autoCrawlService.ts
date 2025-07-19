import axios from 'axios';
import logger from '../utils/logger';

// 模擬的外部災害API數據源
interface ExternalHazardData {
  source: string;
  type: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  metadata?: any;
}

interface AIAnalysisResult {
  id: string;
  timestamp: string;
  overallRiskLevel: string;
  riskScore: number;
  summary: string;
  recommendations: string[];
  dataSource: {
    location: { lat: number; lng: number };
    confidence: number;
    riskFactors: string[];
  };
  rawData: ExternalHazardData[];
}

class AutoCrawlService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private analysisHistory: AIAnalysisResult[] = [];
  private readonly CRAWL_INTERVAL = 10000; // 10秒

  // 模擬的外部數據源
  private readonly dataSources = [
    'https://api.weather.gov.tw/emergency', // 氣象局緊急資訊
    'https://api.cwa.gov.tw/disaster',      // 中央氣象署災害資訊
    'https://alerts.ncdr.nat.gov.tw',       // 災害應變中心
    'https://data.gov.tw/disasters'         // 政府開放資料
  ];

  constructor() {
    logger.info('🤖 AutoCrawlService 初始化完成');
  }

  /**
   * 開始自動爬取
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('⚠️ 自動爬取服務已在運行中');
      return;
    }

    logger.info('🚀 啟動自動爬取服務 - 每10秒執行一次');
    this.isRunning = true;

    // 立即執行一次
    this.performCrawlAndAnalysis();

    // 設置定時器
    this.intervalId = setInterval(() => {
      this.performCrawlAndAnalysis();
    }, this.CRAWL_INTERVAL);
  }

  /**
   * 停止自動爬取
   */
  public stop(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ 自動爬取服務未在運行');
      return;
    }

    logger.info('⏹️ 停止自動爬取服務');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 獲取服務狀態
   */
  public getStatus(): { isRunning: boolean; lastAnalysis: string | null; totalAnalyses: number } {
    return {
      isRunning: this.isRunning,
      lastAnalysis: this.analysisHistory.length > 0 
        ? this.analysisHistory[this.analysisHistory.length - 1].timestamp 
        : null,
      totalAnalyses: this.analysisHistory.length
    };
  }

  /**
   * 獲取分析歷史
   */
  public getAnalysisHistory(limit = 10): AIAnalysisResult[] {
    return this.analysisHistory
      .slice(-limit)
      .reverse(); // 最新的在前面
  }

  /**
   * 主要爬取和分析流程
   */
  private async performCrawlAndAnalysis(): Promise<void> {
    try {
      logger.info('🕷️ 開始爬取外部災害數據...');
      
      // 1. 爬取多個數據源
      const allHazardData = await this.crawlMultipleSources();
      
      if (allHazardData.length === 0) {
        logger.warn('⚠️ 未獲取到新的災害數據');
        return;
      }

      logger.info(`📊 成功爬取到 ${allHazardData.length} 筆災害資料`);

      // 2. AI 分析
      const analysisResult = await this.performAIAnalysis(allHazardData);

      // 3. 保存分析結果
      this.analysisHistory.push(analysisResult);

      // 保持最近100筆分析記錄
      if (this.analysisHistory.length > 100) {
        this.analysisHistory = this.analysisHistory.slice(-100);
      }

      logger.info(`✅ AI分析完成 - 風險等級: ${analysisResult.overallRiskLevel} (${analysisResult.riskScore}/5)`);

      // 4. 如果是高風險，發送通知
      if (analysisResult.riskScore >= 3) {
        this.sendHighRiskNotification(analysisResult);
      }

    } catch (error) {
      logger.error('❌ 自動爬取和分析過程發生錯誤:', error);
    }
  }

  /**
   * 爬取多個數據源
   */
  private async crawlMultipleSources(): Promise<ExternalHazardData[]> {
    const allData: ExternalHazardData[] = [];

    // 並行爬取所有數據源
    const crawlPromises = this.dataSources.map(async (source, index) => {
      try {
        // 模擬真實的API爬取（目前使用模擬數據）
        const data = await this.simulateCrawlSource(source, index);
        return data;
      } catch (error) {
        logger.warn(`⚠️ 數據源 ${source} 爬取失敗:`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(crawlPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allData.push(...result.value);
      } else {
        logger.error(`❌ 數據源 ${this.dataSources[index]} 爬取失敗:`, result.reason);
      }
    });

    return allData;
  }

  /**
   * 模擬爬取單一數據源（將來可替換為真實API）
   */
  private async simulateCrawlSource(source: string, sourceIndex: number): Promise<ExternalHazardData[]> {
    // 模擬網路延遲
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // 隨機生成災害數據（模擬真實爬取）
    const hazardTypes = ['flooding', 'earthquake', 'typhoon', 'landslide', 'fire'];
    const locations = [
      { lat: 25.0330, lng: 121.5654, address: '台北市信義區' },
      { lat: 24.1477, lng: 120.6736, address: '台中市西屯區' },
      { lat: 22.6273, lng: 120.3014, address: '高雄市前金區' },
      { lat: 23.6978, lng: 120.9605, address: '南投縣埔里鎮' },
      { lat: 24.8066, lng: 121.0181, address: '新竹市東區' }
    ];

    const dataCount = Math.floor(Math.random() * 3) + 1; // 1-3筆數據
    const data: ExternalHazardData[] = [];

    for (let i = 0; i < dataCount; i++) {
      const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
      
      data.push({
        source: source,
        type: hazardType,
        location: location,
        severity: severities[Math.floor(Math.random() * severities.length)],
        description: this.generateHazardDescription(hazardType, location.address),
        timestamp: new Date().toISOString(),
        metadata: {
          sourceIndex,
          confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
          urgency: Math.random() > 0.7 ? 'immediate' : 'monitor'
        }
      });
    }

    return data;
  }

  /**
   * 生成災害描述
   */
  private generateHazardDescription(type: string, address: string): string {
    const descriptions: Record<string, string[]> = {
      flooding: [
        `${address}發生積水情況，水深約30-50公分`,
        `${address}附近道路出現淹水，建議避開該區域`,
        `${address}低窪地區積水嚴重，請注意安全`
      ],
      earthquake: [
        `${address}檢測到規模4.2地震，請注意餘震`,
        `${address}發生輕微地震，建議檢查建築結構`,
        `${address}地震活動異常，請保持警戒`
      ],
      typhoon: [
        `${address}受颱風影響，風速達每小時80公里`,
        `${address}颱風警報，請做好防颱準備`,
        `${address}強風豪雨，建議避免外出`
      ],
      landslide: [
        `${address}山坡地出現土石鬆動跡象`,
        `${address}發生小規模土石滑落，道路受阻`,
        `${address}土石流警戒，山區居民請注意`
      ],
      fire: [
        `${address}發生火警，消防隊已到場處理`,
        `${address}建築物火災，影響周邊交通`,
        `${address}森林火災風險升高，請小心用火`
      ]
    };

    const typeDescriptions = descriptions[type] || [`${address}發生${type}災害`];
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  /**
   * 執行AI分析
   */
  private async performAIAnalysis(hazardData: ExternalHazardData[]): Promise<AIAnalysisResult> {
    logger.info('🧠 開始AI分析災害數據...');

    // 模擬AI分析延遲
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 計算整體風險等級
    const riskScore = this.calculateRiskScore(hazardData);
    const riskLevel = this.getRiskLevel(riskScore);

    // 生成AI分析結果
    const analysisResult: AIAnalysisResult = {
      id: `ai_analysis_${Date.now()}`,
      timestamp: new Date().toISOString(),
      overallRiskLevel: riskLevel,
      riskScore: riskScore,
      summary: this.generateAISummary(hazardData, riskLevel),
      recommendations: this.generateRecommendations(hazardData, riskScore),
      dataSource: {
        location: this.calculateCenterLocation(hazardData),
        confidence: this.calculateConfidence(hazardData),
        riskFactors: this.extractRiskFactors(hazardData)
      },
      rawData: hazardData
    };

    return analysisResult;
  }

  /**
   * 計算風險分數
   */
  private calculateRiskScore(hazardData: ExternalHazardData[]): number {
    if (hazardData.length === 0) return 0;

    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeight = hazardData.reduce((sum, data) => sum + severityWeights[data.severity], 0);
    const avgWeight = totalWeight / hazardData.length;

    // 考慮數據量的影響
    const quantityFactor = Math.min(hazardData.length / 5, 1.5); // 最多1.5倍加成
    
    return Math.round((avgWeight * quantityFactor) * 10) / 10; // 保留一位小數
  }

  /**
   * 獲取風險等級描述
   */
  private getRiskLevel(score: number): string {
    if (score <= 1) return '低風險';
    if (score <= 2) return '中低風險';
    if (score <= 3) return '中等風險';
    if (score <= 4) return '高風險';
    return '極高風險';
  }

  /**
   * 生成AI摘要
   */
  private generateAISummary(hazardData: ExternalHazardData[], riskLevel: string): string {
    const typeCount = hazardData.reduce((acc, data) => {
      acc[data.type] = (acc[data.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const majorTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${this.getChineseHazardType(type)}(${count}筆)`)
      .join('、');

    const criticalCount = hazardData.filter(d => d.severity === 'critical').length;
    const highCount = hazardData.filter(d => d.severity === 'high').length;

    let summary = `根據最新爬取的 ${hazardData.length} 筆災害資料分析，當前風險等級為「${riskLevel}」。`;
    
    if (majorTypes) {
      summary += ` 主要災害類型包括：${majorTypes}。`;
    }

    if (criticalCount > 0) {
      summary += ` 其中有 ${criticalCount} 筆極嚴重災害需要立即關注。`;
    } else if (highCount > 0) {
      summary += ` 其中有 ${highCount} 筆高風險災害需要密切監控。`;
    }

    return summary;
  }

  /**
   * 獲取中文災害類型
   */
  private getChineseHazardType(type: string): string {
    const typeMap: Record<string, string> = {
      flooding: '淹水',
      earthquake: '地震',
      typhoon: '颱風',
      landslide: '土石流',
      fire: '火災'
    };
    return typeMap[type] || type;
  }

  /**
   * 生成建議
   */
  private generateRecommendations(hazardData: ExternalHazardData[], riskScore: number): string[] {
    const recommendations: string[] = [];

    // 基於風險分數的通用建議
    if (riskScore >= 4) {
      recommendations.push('建議立即啟動應急響應程序');
      recommendations.push('避免前往高風險區域');
      recommendations.push('隨時關注官方最新消息');
    } else if (riskScore >= 3) {
      recommendations.push('建議提高警戒級別');
      recommendations.push('準備應急物資');
      recommendations.push('檢查逃生路線');
    } else if (riskScore >= 2) {
      recommendations.push('持續監控災害發展');
      recommendations.push('注意天氣變化');
    } else {
      recommendations.push('維持正常警戒狀態');
    }

    // 基於災害類型的具體建議
    const hazardTypes = [...new Set(hazardData.map(d => d.type))];
    
    if (hazardTypes.includes('flooding')) {
      recommendations.push('避開低窪和易積水路段');
      recommendations.push('準備防水用品');
    }
    
    if (hazardTypes.includes('earthquake')) {
      recommendations.push('檢查建築物結構安全');
      recommendations.push('固定易倒塌物品');
    }
    
    if (hazardTypes.includes('typhoon')) {
      recommendations.push('檢查門窗是否牢固');
      recommendations.push('儲備3天以上的食物和飲水');
    }

    return recommendations.slice(0, 6); // 最多6條建議
  }

  /**
   * 計算中心位置
   */
  private calculateCenterLocation(hazardData: ExternalHazardData[]): { lat: number; lng: number } {
    if (hazardData.length === 0) return { lat: 25.0330, lng: 121.5654 }; // 預設台北

    const avgLat = hazardData.reduce((sum, data) => sum + data.location.lat, 0) / hazardData.length;
    const avgLng = hazardData.reduce((sum, data) => sum + data.location.lng, 0) / hazardData.length;

    return { lat: Math.round(avgLat * 10000) / 10000, lng: Math.round(avgLng * 10000) / 10000 };
  }

  /**
   * 計算信心度
   */
  private calculateConfidence(hazardData: ExternalHazardData[]): number {
    if (hazardData.length === 0) return 0;

    const avgConfidence = hazardData.reduce((sum, data) => {
      return sum + (data.metadata?.confidence || 0.8);
    }, 0) / hazardData.length;

    // 考慮數據源數量對信心度的影響
    const sourceFactor = Math.min(hazardData.length / 10, 1); // 更多數據 = 更高信心
    
    return Math.round((avgConfidence * sourceFactor) * 100) / 100;
  }

  /**
   * 提取風險因子
   */
  private extractRiskFactors(hazardData: ExternalHazardData[]): string[] {
    const factors = new Set<string>();

    hazardData.forEach(data => {
      factors.add(data.type);
      
      if (data.severity === 'critical' || data.severity === 'high') {
        factors.add('high_severity');
      }
      
      if (data.metadata?.urgency === 'immediate') {
        factors.add('immediate_action_required');
      }
    });

    return Array.from(factors);
  }

  /**
   * 發送高風險通知
   */
  private sendHighRiskNotification(analysis: AIAnalysisResult): void {
    logger.warn(`🚨 高風險警報！風險等級: ${analysis.overallRiskLevel} (${analysis.riskScore}/5)`);
    logger.warn(`📋 摘要: ${analysis.summary}`);
    logger.warn(`💡 建議: ${analysis.recommendations.slice(0, 3).join(', ')}`);
    
    // 這裡可以整合真實的通知系統，如：
    // - 發送 Email
    // - 推送到手機 APP
    // - 發送 Slack/Teams 消息
    // - 觸發警報系統等
  }
}

// 導出單例
export const autoCrawlService = new AutoCrawlService();
export default autoCrawlService; 