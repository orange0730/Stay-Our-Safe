import { app, InvocationContext, HttpRequest, HttpResponseInit } from "@azure/functions";
import { CosmosService } from '../services/cosmosService';

export async function RecentAlertsAPI(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Recent Alerts API called');

    try {
        const cosmosService = new CosmosService();
        await cosmosService.initialize();

        // 查詢最近的風險評估報告
        const query = {
            query: `SELECT 
                        c.id,
                        c.timestamp,
                        c.overallRiskLevel,
                        c.riskScore,
                        c.summary,
                        c.affectedAreas,
                        c.recommendations,
                        c.dataSource
                    FROM c 
                    WHERE c.type = 'risk_assessment' 
                    AND c.source = 'AI_ANALYZER'
                    ORDER BY c.timestamp DESC
                    OFFSET 0 LIMIT 10`
        };

        const { resources: assessments } = await cosmosService.getContainer()
            .items.query(query).fetchAll();

        // 也查詢最近有警報的原始資料
        const alertQuery = {
            query: `SELECT 
                        c.id,
                        c.source,
                        c.timestamp,
                        c.location,
                        c.parameter,
                        c["value"],
                        c.unit,
                        c.alert,
                        c.alertLevel
                    FROM c 
                    WHERE c.alert != null 
                    AND c.alertLevel IN ('high', 'critical')
                    ORDER BY c.timestamp DESC
                    OFFSET 0 LIMIT 20`
        };

        const { resources: alerts } = await cosmosService.getContainer()
            .items.query(alertQuery).fetchAll();

        // 組合回應
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            recentAssessments: assessments,
            recentAlerts: alerts,
            summary: {
                totalAssessments: assessments.length,
                totalAlerts: alerts.length,
                criticalAlerts: alerts.filter(a => a.alertLevel === 'critical').length,
                highAlerts: alerts.filter(a => a.alertLevel === 'high').length
            }
        };

        return {
            status: 200,
            body: JSON.stringify(response),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // 允許所有來源，生產環境請設定特定網域
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        };

    } catch (error) {
        context.error('Error fetching recent alerts:', error);
        return {
            status: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }),
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        };
    }
}

// HTTP 觸發器，路由為 /api/alerts/recent
app.http('RecentAlertsAPI', {
    methods: ['GET', 'OPTIONS'], // 支援 OPTIONS 以處理 CORS preflight
    authLevel: 'anonymous',
    route: 'alerts/recent',
    handler: RecentAlertsAPI
}); 