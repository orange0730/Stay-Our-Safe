import { app, InvocationContext, Timer } from "@azure/functions";
import axios from 'axios';
import { CosmosService } from '../services/cosmosService';
import { StandardizedData } from '../models/dataModels';

export async function CWADataFetcher(myTimer: Timer, context: InvocationContext): Promise<void> {
    context.log('CWA Data Fetcher function started');

    const cosmosService = new CosmosService();
    await cosmosService.initialize();

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
                        value: 0, // 警報沒有數值，設為 0
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

        context.log('CWA data fetching completed successfully');
    } catch (error) {
        context.error('Error fetching CWA data:', error);
        throw error;
    }
}

// 改用 HTTP Trigger 進行測試
app.http('CWADataFetcher', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        await CWADataFetcher(null as any, context);
        return { body: 'CWA Data Fetcher executed successfully' };
    }
}); 