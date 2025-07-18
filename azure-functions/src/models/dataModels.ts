// 標準化的資料格式
export interface StandardizedData {
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

// Cosmos DB 設定
export const cosmosConfig = {
  databaseId: 'SampleDB',
  containerId: 'user',
  partitionKey: '/source'
}; 