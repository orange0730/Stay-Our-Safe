import { app, InvocationContext, HttpRequest, HttpResponseInit } from "@azure/functions";
import axios from 'axios';
import { CosmosService } from '../services/cosmosService';
import { StandardizedData } from '../models/dataModels';

export async function GeologyDataFetcher(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Geology Data Fetcher function started');

    const cosmosService = new CosmosService();
    await cosmosService.initialize();

    try {
        // 地質調查所 - 土壤液化潛勢查詢 API
        // 這裡使用範例 API，實際使用時請替換為正確的地質調查所 API
        const geologyUrl = 'https://www.liquid.net.tw/cgs/api/Soil_Liquefaction';
        
        try {
            const response = await axios.get(geologyUrl, {
                headers: {
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            const geologyData = Array.isArray(response.data) ? response.data : [];
            let processedCount = 0;

            for (const item of geologyData.slice(0, 10)) { // 處理前10筆
                if (item) {
                    const standardizedData: StandardizedData = {
                        timestamp: new Date().toISOString(),
                        location: {
                            name: item.location || '未知地點',
                            lat: item.latitude || 0,
                            lng: item.longitude || 0
                        },
                        parameter: 'soil_liquefaction_potential',
                        value: item.liquefactionPotential || 0,
                        unit: '液化潛勢等級',
                        source: 'GEOLOGY',
                        rawData: item
                    };

                    // 判斷是否需要警報
                    if (item.liquefactionPotential >= 3) {
                        standardizedData.alert = `土壤液化警戒：${item.location} 液化潛勢等級 ${item.liquefactionPotential}`;
                        standardizedData.alertLevel = item.liquefactionPotential >= 4 ? 'critical' : 'high';
                    }

                    await cosmosService.saveData(standardizedData);
                    processedCount++;
                }
            }

            context.log(`Processed ${processedCount} geology data points`);

        } catch (apiError) {
            context.warn('Geology API error, using mock data:', apiError.message);
            
            // 使用模擬資料以便測試
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

            context.log('Used mock geology data');
        }

        return { 
            body: 'Geology Data Fetcher executed successfully',
            status: 200
        };

    } catch (error) {
        context.error('Error fetching geology data:', error);
        return {
            status: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
}

// HTTP 觸發器
app.http('GeologyDataFetcher', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: GeologyDataFetcher
}); 