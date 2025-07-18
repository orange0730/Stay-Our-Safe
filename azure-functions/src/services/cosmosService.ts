import { CosmosClient, Container, Database, ItemResponse } from '@azure/cosmos';
import { StandardizedData, cosmosConfig } from '../models/dataModels';

export class CosmosService {
  private client: CosmosClient;
  private database: Database;
  private container: Container;

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

  async updateData(id: string, partitionValue: string, updates: Partial<StandardizedData>): Promise<void> {
    try {
      const { resource } = await this.container.item(id, partitionValue).read();
      const updatedItem = { ...resource, ...updates };
      await this.container.item(id, partitionValue).replace(updatedItem);
      console.log(`Data updated in Cosmos DB: ${id}`);
    } catch (error) {
      console.error('Error updating Cosmos DB:', error);
      throw error;
    }
  }
} 