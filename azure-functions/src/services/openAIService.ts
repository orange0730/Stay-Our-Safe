import { OpenAIClient, AzureKeyCredential } from "@azure/openai";
import { StandardizedData } from '../models/dataModels';

export class OpenAIService {
    private client: OpenAIClient;
    private deploymentName: string;

    constructor() {
        const endpoint = process.env.OPENAI_ENDPOINT;
        const apiKey = process.env.OPENAI_API_KEY;
        this.deploymentName = process.env.OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo';

        if (!endpoint || !apiKey) {
            throw new Error('OpenAI configuration is missing');
        }

        // 使用支援 o4-mini 的 API 版本
        this.client = new OpenAIClient(
            endpoint, 
            new AzureKeyCredential(apiKey),
            {
                apiVersion: '2024-12-01-preview'
            }
        );
    }

    async analyzeDisasterData(data: StandardizedData): Promise<{ alert: string; alertLevel: string }> {
        const prompt = `分析以下災害數據並判斷是否需要發出警報：
        參數: ${data.parameter}
        數值: ${data.value} ${data.unit}
        地點: ${data.location.name}
        
        如果這個數據代表危險情況，請用繁體中文簡短描述警報內容（50字以內）。
        如果不需要警報，回覆"無需警報"。`;

        const response = await this.client.getChatCompletions(
            this.deploymentName,
            [
                {
                    role: "system",
                    content: "你是一個專業的防災分析助手。"
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            {
                max_completion_tokens: 100
            } as any
        );

        const analysisText = response.choices[0]?.message?.content?.trim() || '無法分析';
        
        // 根據回應判斷警報等級
        let alertLevel = 'none';
        if (analysisText !== '無需警報' && analysisText !== '無法分析') {
            // 簡單的規則判斷警報等級
            if (analysisText.includes('緊急') || analysisText.includes('立即')) {
                alertLevel = 'critical';
            } else if (analysisText.includes('警戒') || analysisText.includes('注意')) {
                alertLevel = 'high';
            } else {
                alertLevel = 'medium';
            }
        }

        return {
            alert: analysisText,
            alertLevel: alertLevel
        };
    }

    async analyzeDisasterRisk(prompt: string): Promise<string> {
        try {
            const response = await this.client.getChatCompletions(
                this.deploymentName,
                [
                    {
                        role: "system",
                        content: "你是一個專業的防災風險評估分析師。請根據提供的資料進行分析，並以指定的 JSON 格式回應。"
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                {
                    max_completion_tokens: 1000,
                    response_format: { type: "json_object" }
                } as any
            );

            return response.choices[0]?.message?.content?.trim() || '無法產生分析';
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            throw error;
        }
    }

    private createAnalysisPrompt(data: StandardizedData): string {
        return `
請分析以下防災數據，判斷是否有危險或異常狀況：

時間：${data.timestamp}
地點：${data.location.name}
參數：${data.parameter}
數值：${data.value} ${data.unit || ''}
資料來源：${data.source}

請特別注意：
1. 地震規模超過 4.0 需要警示
2. 10分鐘雨量超過 10mm 需要警示
3. 水位超過警戒值需要警示
4. 任何異常數值變化

請用繁體中文回應，格式為 JSON：{"alert": "警示內容", "alertLevel": "low/medium/high/critical"}
`;
    }
} 