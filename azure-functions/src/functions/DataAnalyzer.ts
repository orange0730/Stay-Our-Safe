import { app, InvocationContext, HttpRequest, HttpResponseInit } from "@azure/functions";
import { CosmosService } from '../services/cosmosService';
import { OpenAIService } from '../services/openAIService';
import { StandardizedData } from '../models/dataModels';

interface RiskAssessment {
    id?: string;
    timestamp: string;
    analysisTime: string;
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
    affectedAreas: Area[];
    recommendations: string[];
    summary: string;
    dataSource: string[];
    rawAnalysis?: string;
}

interface Area {
    name: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    hazards: Hazard[];
    population?: number;
    evacuationNeeded: boolean;
}

interface Hazard {
    type: string;
    severity: string;
    description: string;
    dataPoints: any[];
}

export async function DataAnalyzer(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Data Analyzer function started');

    const cosmosService = new CosmosService();
    const openAIService = new OpenAIService();
    
    await cosmosService.initialize();

    try {
        // 取得最近的資料進行分析
        const recentDataQuery = {
            query: `SELECT * FROM c 
                    WHERE c.timestamp > @startTime 
                    ORDER BY c.timestamp DESC`,
            parameters: [{
                name: '@startTime',
                value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 過去24小時
            }]
        };

        const { resources: recentData } = await cosmosService.getContainer().items
            .query(recentDataQuery)
            .fetchAll();

        context.log(`Found ${recentData.length} recent data points for analysis`);

        if (recentData.length === 0) {
            return {
                status: 200,
                body: JSON.stringify({ 
                    message: 'No recent data to analyze',
                    timestamp: new Date().toISOString()
                })
            };
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
            summary: {}
        };

        // 整理各資料來源的摘要
        for (const [source, data] of Object.entries(dataBySource)) {
            const sourceData = data as any[];
            dataSummary.summary[source] = {
                totalDataPoints: sourceData.length,
                parameters: [...new Set(sourceData.map(d => d.parameter))],
                alerts: sourceData.filter(d => d.alert).map(d => ({
                    location: d.location.name,
                    alert: d.alert,
                    level: d.alertLevel,
                    value: `${d.value} ${d.unit}`
                })),
                criticalLocations: sourceData
                    .filter(d => d.alertLevel === 'critical' || d.alertLevel === 'high')
                    .map(d => d.location.name)
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

        請特別注意：
        1. 如果有水庫蓄水率低於 30% 或河川水位異常，需要特別標註
        2. 如果有地震或天氣警報，需要評估其影響範圍
        3. 提供具體可行的應對建議
        4. 使用繁體中文回應
        `;

        const analysis = await openAIService.analyzeDisasterRisk(analysisPrompt);
        
        // 解析 OpenAI 的回應
        let riskAssessment: RiskAssessment;
        try {
            const parsedAnalysis = JSON.parse(analysis);
            riskAssessment = {
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
        } catch (parseError) {
            context.error('Failed to parse OpenAI response:', parseError);
            // 如果解析失敗，建立基本的評估
            riskAssessment = {
                timestamp: new Date().toISOString(),
                analysisTime: new Date().toISOString(),
                overallRiskLevel: 'medium',
                riskScore: 50,
                affectedAreas: [],
                recommendations: ['請檢查原始資料以獲得更詳細的分析'],
                summary: 'AI 分析失敗，請檢查原始資料',
                dataSource: Object.keys(dataBySource),
                rawAnalysis: analysis
            };
        }

        // 儲存分析結果
        const savedAssessment = await cosmosService.saveData({
            ...riskAssessment,
            id: `risk-assessment-${Date.now()}`,
            type: 'risk_assessment',
            source: 'AI_ANALYZER'
        } as any);

        const assessmentId = savedAssessment.resource?.id || `risk-assessment-${Date.now()}`;
        context.log('Risk assessment saved:', assessmentId);

        return {
            status: 200,
            body: JSON.stringify({
                success: true,
                assessmentId: assessmentId,
                assessment: riskAssessment
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };

    } catch (error) {
        context.error('Error in Data Analyzer:', error);
        return {
            status: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
}

// HTTP 觸發器
app.http('DataAnalyzer', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: DataAnalyzer
}); 