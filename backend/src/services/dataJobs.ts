import axios from 'axios';
import { CosmosClient, Container, Database, ItemResponse } from '@azure/cosmos';
import { OpenAI } from 'openai';

// 標準化的資料格式
interface StandardizedData {
  id?: string;
  timestamp: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  parameter: string;
  value: number;
  unit: string;
  source: 'CWA' | 'WRA' | 'GEO' | 'GEOLOGY';
  alert?: string;
  alertLevel?: 'low' | 'medium' | 'high' | 'critical';
  analyzedAt?: string;
  rawData?: any;
}

// Cosmos DB 服務類別
class CosmosService {
  private client: CosmosClient;
  private database!: Database;
  private container!: Container;

  constructor() {
    const connectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('COSMOS_CONNECTION_STRING is not defined');
    }
    this.client = new CosmosClient(connectionString);
  }

  async initialize(): Promise<void> {
    this.database = this.client.database('SampleDB');
    this.container = this.database.container('user');
  }

  getContainer(): Container {
    return this.container;
  }

  async saveData(data: StandardizedData): Promise<ItemResponse<StandardizedData>> {
    const item = {
      ...data,
      id: data.id || `${data.source}-${data.parameter}-${Date.now()}`,
      partitionKey: data.source
    };

    const response = await this.container.items.create(item);
    console.log(`Data saved to Cosmos DB: ${data.source} - ${data.parameter}`);
    return response;
  }
}

// OpenAI 服務類別
class OpenAIService {
  private client: OpenAI;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo';

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI configuration is missing');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: endpoint,
      defaultHeaders: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async analyzeDisasterRisk(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          {
            role: "system",
            content: "你是一個專業的防災風險評估分析師。請根據提供的資料進行分析，並以指定的 JSON 格式回應。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      return response.choices[0]?.message?.content?.trim() || '無法產生分析';
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }
} 

// CWA 資料擷取函數
async function fetchCWAData(cosmosService: CosmosService): Promise<void> {
  console.log('Fetching CWA data...');
  
  try {
    // 取得地震資訊
    const earthquakeUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/E-A0015-001`;
    const response = await axios.get(earthquakeUrl, {
      params: {
        Authorization: process.env.CWA_API_KEY,
        format: 'JSON'
      }
    });

    const records = response.data?.records?.Earthquake || [];
    
    for (const eq of records) {
      const standardizedData: StandardizedData = {
        timestamp: eq.EarthquakeInfo?.OriginTime || new Date().toISOString(),
        location: {
          name: eq.EarthquakeInfo?.Epicenter?.Location || '未知',
          lat: parseFloat(eq.EarthquakeInfo?.Epicenter?.EpicenterLatitude) || 0,
          lng: parseFloat(eq.EarthquakeInfo?.Epicenter?.EpicenterLongitude) || 0
        },
        parameter: 'earthquake_magnitude',
        value: parseFloat(eq.EarthquakeInfo?.EarthquakeMagnitude?.MagnitudeValue) || 0,
        unit: 'ML',
        source: 'CWA',
        rawData: eq
      };

      await cosmosService.saveData(standardizedData);
    }

    // 取得天氣警報
    const warningUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/W-C0033-001`;
    const warningResponse = await axios.get(warningUrl, {
      params: {
        Authorization: process.env.CWA_API_KEY,
        format: 'JSON'
      }
    });

    const warnings = warningResponse.data?.records?.location || [];
    
    for (const warning of warnings) {
      if (warning.hazardConditions?.hazards?.length > 0) {
        for (const hazard of warning.hazardConditions.hazards) {
          const standardizedData: StandardizedData = {
            timestamp: hazard.startTime || new Date().toISOString(),
            location: {
              name: warning.locationName || '未知',
              lat: warning.lat || 0,
              lng: warning.lon || 0
            },
            parameter: 'weather_warning',
            value: 0,
            unit: '',
            source: 'CWA',
            alert: `${hazard.phenomena?.value || '天氣警報'}: ${hazard.description?.value || ''}`,
            alertLevel: 'high' as const,
            rawData: hazard
          };

          await cosmosService.saveData(standardizedData);
        }
      }
    }

    console.log('CWA data fetching completed');
  } catch (error) {
    console.error('Error fetching CWA data:', error);
    throw error;
  }
} 

// WRA 資料擷取函數
async function fetchWRAData(cosmosService: CosmosService): Promise<void> {
  console.log('Fetching WRA data...');
  
  try {
    // 水庫水情資料
    const reservoirUrl = 'https://fhy.wra.gov.tw/WraApi/v1/Reservoir/RealTimeInfo';
    const waterResponse = await axios.get(reservoirUrl, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    const waterLevels = Array.isArray(waterResponse.data) ? waterResponse.data : [];
    
    let processedReservoirs = 0;
    for (const reservoir of waterLevels.slice(0, 5)) {
      if (reservoir.StationNo && reservoir.EffectiveStorage !== null) {
        const standardizedData: StandardizedData = {
          timestamp: reservoir.Time || new Date().toISOString(),
          location: {
            name: `水庫站號 ${reservoir.StationNo}`,
            lat: 0,
            lng: 0
          },
          parameter: 'reservoir_capacity',
          value: reservoir.EffectiveStorage,
          unit: '萬立方公尺',
          source: 'WRA',
          rawData: reservoir
        };

        const storageRate = parseFloat(reservoir.PercentageOfStorage || '0');
        if (storageRate < 30) {
          standardizedData.alert = `水庫警戒：站號 ${reservoir.StationNo} 蓄水率僅 ${storageRate.toFixed(2)}%`;
          standardizedData.alertLevel = storageRate < 20 ? 'critical' : 'high';
        }

        await cosmosService.saveData(standardizedData);
        processedReservoirs++;
      }
    }

    // 河川水位資料
    const riverUrl = 'https://fhy.wra.gov.tw/WraApi/v1/Water/RealTimeInfo';
    const riverResponse = await axios.get(riverUrl, {
      headers: {
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    const riverLevels = Array.isArray(riverResponse.data) ? riverResponse.data : [];
    
    let processedRivers = 0;
    for (const river of riverLevels.slice(0, 5)) {
      if (river.StationNo && river.WaterLevel !== null) {
        const standardizedData: StandardizedData = {
          timestamp: river.Time || new Date().toISOString(),
          location: {
            name: `水位站 ${river.StationNo}`,
            lat: 0,
            lng: 0
          },
          parameter: 'river_water_level',
          value: river.WaterLevel,
          unit: '公尺',
          source: 'WRA',
          rawData: river
        };

        await cosmosService.saveData(standardizedData);
        processedRivers++;
      }
    }

    console.log(`WRA data fetched: ${processedReservoirs} reservoirs, ${processedRivers} river stations`);
  } catch (error) {
    console.error('Error fetching WRA data:', error);
    throw error;
  }
} 

// Geology 資料擷取函數
async function fetchGeologyData(cosmosService: CosmosService): Promise<void> {
  console.log('Fetching Geology data...');
  
  try {
    // 地質調查所 API - 使用模擬資料作為示範
    const mockData = [
      {
        location: '台北市信義區',
        latitude: 25.0330,
        longitude: 121.5654,
        liquefactionPotential: 2,
        description: '低度液化潛勢'
      },
      {
        location: '新北市板橋區',
        latitude: 25.0124,
        longitude: 121.4625,
        liquefactionPotential: 4,
        description: '高度液化潛勢'
      }
    ];

    for (const item of mockData) {
      const standardizedData: StandardizedData = {
        timestamp: new Date().toISOString(),
        location: {
          name: item.location,
          lat: item.latitude,
          lng: item.longitude
        },
        parameter: 'soil_liquefaction_potential',
        value: item.liquefactionPotential,
        unit: '液化潛勢等級',
        source: 'GEOLOGY',
        rawData: item
      };

      if (item.liquefactionPotential >= 3) {
        standardizedData.alert = `土壤液化警戒：${item.location} 液化潛勢等級 ${item.liquefactionPotential}`;
        standardizedData.alertLevel = item.liquefactionPotential >= 4 ? 'critical' : 'high';
      }

      await cosmosService.saveData(standardizedData);
    }

    console.log('Geology data fetched');
  } catch (error) {
    console.error('Error fetching Geology data:', error);
    throw error;
  }
}

// 分析資料函數
async function analyzeData(cosmosService: CosmosService, openAIService: OpenAIService): Promise<void> {
  console.log('Analyzing data...');
  
  try {
    // 取得最近的資料進行分析
    const recentDataQuery = {
      query: `SELECT * FROM c 
              WHERE c.timestamp > @startTime 
              ORDER BY c.timestamp DESC`,
      parameters: [{
        name: '@startTime',
        value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }]
    };

    const { resources: recentData } = await cosmosService.getContainer().items
      .query(recentDataQuery)
      .fetchAll();

    if (recentData.length === 0) {
      console.log('No recent data to analyze');
      return;
    }

    // 整理資料以便分析
    const dataBySource = recentData.reduce((acc: any, item: StandardizedData) => {
      if (!acc[item.source]) {
        acc[item.source] = [];
      }
      acc[item.source].push({
        parameter: item.parameter,
        value: item.value,
        unit: item.unit,
        location: item.location,
        timestamp: item.timestamp,
        alert: item.alert,
        alertLevel: item.alertLevel
      });
      return acc;
    }, {});

    // 準備給 OpenAI 的資料摘要
    const dataSummary = {
      dataCollectionTime: new Date().toISOString(),
      sources: Object.keys(dataBySource),
      summary: {} as Record<string, any>
    };

    // 整理各資料來源的摘要
    for (const [source, data] of Object.entries(dataBySource)) {
      const sourceData = data as any[];
      dataSummary.summary[source] = {
        totalDataPoints: sourceData.length,
        parameters: [...new Set(sourceData.map((d: any) => d.parameter))],
        alerts: sourceData.filter((d: any) => d.alert).map((d: any) => ({
          location: d.location.name,
          alert: d.alert,
          level: d.alertLevel,
          value: `${d.value} ${d.unit}`
        })),
        criticalLocations: sourceData
          .filter((d: any) => d.alertLevel === 'critical' || d.alertLevel === 'high')
          .map((d: any) => d.location.name)
      };
    }

    // 使用 OpenAI 分析資料
    const analysisPrompt = `
    請分析以下台灣災害監測資料，並提供風險評估報告。

    資料摘要：
    ${JSON.stringify(dataSummary, null, 2)}

    請以以下 JSON 格式回應：
    {
        "overallRiskLevel": "low/medium/high/critical",
        "riskScore": 0-100的數字,
        "affectedAreas": [
            {
                "name": "地區名稱",
                "riskLevel": "low/medium/high/critical",
                "hazards": [
                    {
                        "type": "災害類型(如：水災、地震等)",
                        "severity": "嚴重程度",
                        "description": "詳細描述"
                    }
                ],
                "evacuationNeeded": true/false
            }
        ],
        "recommendations": [
            "具體的應對建議1",
            "具體的應對建議2"
        ],
        "summary": "整體風險評估摘要（150字以內）"
    }
    `;

    const analysis = await openAIService.analyzeDisasterRisk(analysisPrompt);
    
    // 解析並儲存分析結果
    try {
      const parsedAnalysis = JSON.parse(analysis);
      const riskAssessment = {
        id: `risk-assessment-${Date.now()}`,
        type: 'risk_assessment',
        source: 'AI_ANALYZER' as const,
        timestamp: new Date().toISOString(),
        analysisTime: new Date().toISOString(),
        overallRiskLevel: parsedAnalysis.overallRiskLevel || 'low',
        riskScore: parsedAnalysis.riskScore || 0,
        affectedAreas: parsedAnalysis.affectedAreas || [],
        recommendations: parsedAnalysis.recommendations || [],
        summary: parsedAnalysis.summary || '無法產生摘要',
        dataSource: Object.keys(dataBySource),
        rawAnalysis: analysis
      };

      await cosmosService.saveData(riskAssessment as any);
      console.log('Risk assessment saved');
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
    }
  } catch (error) {
    console.error('Error analyzing data:', error);
    throw error;
  }
}

// 主要的 fetchAndAnalyze 函數
export async function fetchAndAnalyze(): Promise<void> {
  console.log('Starting data fetch and analysis job...');
  
  const cosmosService = new CosmosService();
  const openAIService = new OpenAIService();
  
  try {
    // 初始化 Cosmos DB
    await cosmosService.initialize();
    
    // 並行擷取所有資料來源
    await Promise.all([
      fetchCWAData(cosmosService),
      fetchWRAData(cosmosService),
      fetchGeologyData(cosmosService)
    ]);
    
    // 分析資料
    await analyzeData(cosmosService, openAIService);
    
    console.log('Data fetch and analysis job completed successfully');
  } catch (error) {
    console.error('Error in fetchAndAnalyze:', error);
    throw error;
  }
} 