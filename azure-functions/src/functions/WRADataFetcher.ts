import { app, InvocationContext, Timer, HttpRequest, HttpResponseInit } from "@azure/functions";
import axios from 'axios';
import { CosmosService } from '../services/cosmosService';
import { StandardizedData } from '../models/dataModels';

export async function WRADataFetcher(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('WRA Data Fetcher function started');

    const cosmosService = new CosmosService();
    await cosmosService.initialize();

    try {
        context.log('Fetching reservoir data...');
        // 水庫水情資料
        // 使用水利署防災資訊服務網 API
        const reservoirUrl = 'https://fhy.wra.gov.tw/WraApi/v1/Reservoir/RealTimeInfo';
        const waterResponse = await axios.get(reservoirUrl, {
            headers: {
                'Accept': 'application/json'
            },
            timeout: 30000 // 30秒超時
        });

        context.log(`Reservoir API response status: ${waterResponse.status}`);
        const waterLevels = Array.isArray(waterResponse.data) ? waterResponse.data : [];
        context.log(`Found ${waterLevels.length} reservoirs`);
        
        let processedReservoirs = 0;
        for (const reservoir of waterLevels.slice(0, 5)) { // 只處理前5個，避免太多日誌
            if (reservoir.StationNo && reservoir.EffectiveStorage !== null) {
                const standardizedData: StandardizedData = {
                    timestamp: reservoir.Time || new Date().toISOString(),
                    location: {
                        name: `水庫站號 ${reservoir.StationNo}`,
                        lat: 0, // API 不提供座標
                        lng: 0
                    },
                    parameter: 'reservoir_capacity',
                    value: reservoir.EffectiveStorage,
                    unit: '萬立方公尺',
                    source: 'WRA',
                    rawData: reservoir
                };

                // 判斷是否需要警報（蓄水率低於30%）
                const storageRate = parseFloat(reservoir.PercentageOfStorage || '0');
                if (storageRate < 30) {
                    standardizedData.alert = `水庫警戒：站號 ${reservoir.StationNo} 蓄水率僅 ${storageRate.toFixed(2)}%`;
                    standardizedData.alertLevel = storageRate < 20 ? 'critical' : 'high';
                }

                // 暫時只顯示資料
                context.log('水庫資料:', JSON.stringify(standardizedData, null, 2));
                await cosmosService.saveData(standardizedData);
                processedReservoirs++;
            }
        }

        context.log('Fetching river water level data...');
        // 河川水位資料
        const riverUrl = 'https://fhy.wra.gov.tw/WraApi/v1/Water/RealTimeInfo';
        const riverResponse = await axios.get(riverUrl, {
            headers: {
                'Accept': 'application/json'
            },
            timeout: 30000 // 30秒超時
        });

        context.log(`River API response status: ${riverResponse.status}`);
        const riverLevels = Array.isArray(riverResponse.data) ? riverResponse.data : [];
        context.log(`Found ${riverLevels.length} river water level stations`);
        
        let processedRivers = 0;
        for (const river of riverLevels.slice(0, 5)) { // 只處理前5個，避免太多日誌
            if (river.StationNo && river.WaterLevel !== null) {
                const standardizedData: StandardizedData = {
                    timestamp: river.Time || new Date().toISOString(),
                    location: {
                        name: `水位站 ${river.StationNo}`,
                        lat: 0, // API 不提供座標
                        lng: 0
                    },
                    parameter: 'river_water_level',
                    value: river.WaterLevel,
                    unit: '公尺',
                    source: 'WRA',
                    rawData: river
                };

                // 暫時只顯示資料
                context.log('河川水位資料:', JSON.stringify(standardizedData, null, 2));
                await cosmosService.saveData(standardizedData);
                processedRivers++;
            }
        }

        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            reservoirs: {
                total: waterLevels.length,
                processed: processedReservoirs
            },
            rivers: {
                total: riverLevels.length,
                processed: processedRivers
            }
        };

        context.log('WRA data fetched successfully:', JSON.stringify(summary));
        return { 
            status: 200,
            body: JSON.stringify(summary),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    } catch (error) {
        context.error('Error fetching WRA data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
        };
        
        return {
            status: 500,
            body: JSON.stringify(errorDetails),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

// 改為 HTTP 觸發器
app.http('WRADataFetcher', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: WRADataFetcher
}); 