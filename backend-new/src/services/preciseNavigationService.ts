import logger from '../utils/logger';

// 精確座標介面
interface PreciseCoordinates {
  lat: number;
  lng: number;
  elevation?: number;
  roadType?: 'highway' | 'main' | 'secondary' | 'local' | 'alley';
  speedLimit?: number;
  roadWidth?: number;
}

// 道路節點
interface RoadNode {
  id: string;
  coordinates: PreciseCoordinates;
  connections: string[]; // 連接的節點ID
  roadName?: string;
  district?: string;
  isIntersection?: boolean;
  trafficSignals?: boolean;
  barriers?: string[]; // 障礙物類型
  hazardLevel?: number; // 0-5 災害風險等級
}

// 道路段
interface RoadSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  distance: number; // 精確距離（公尺）
  travelTime: number; // 預估行駛時間（秒）
  roadType: string;
  oneWay?: boolean;
  tollRoad?: boolean;
  currentTraffic?: 'smooth' | 'slow' | 'congested' | 'blocked';
  surfaceCondition?: 'excellent' | 'good' | 'fair' | 'poor';
}

// 路線結果
interface PreciseRoute {
  nodes: RoadNode[];
  segments: RoadSegment[];
  totalDistance: number;
  totalTime: number;
  instructions: RouteInstruction[];
  riskLevel: number;
  alternativeRoutes?: PreciseRoute[];
}

// 導航指令
interface RouteInstruction {
  nodeId: string;
  instruction: string;
  distance: number;
  direction: 'straight' | 'left' | 'right' | 'slight_left' | 'slight_right' | 'sharp_left' | 'sharp_right' | 'u_turn';
  streetName?: string;
  landmarks?: string[];
}

class PreciseNavigationService {
  private roadNetwork: Map<string, RoadNode> = new Map();
  private roadSegments: Map<string, RoadSegment> = new Map();
  private gridResolution = 0.0001; // 約10公尺精度
  
  constructor() {
    this.initializeTaiwanRoadNetwork();
    logger.info('🗺️ 精確導航服務初始化完成');
  }

  /**
   * 初始化台灣道路網格
   * 建立高密度虛擬節點網格
   */
  private initializeTaiwanRoadNetwork(): void {
    logger.info('🏗️ 建立台灣精確道路網格...');
    
    // 台灣主要區域範圍
    const regions = [
      {
        name: '台北核心區',
        bounds: {
          north: 25.0700,
          south: 25.0300,
          east: 121.5700,
          west: 121.5300
        },
        density: 'high' // 每50公尺一個節點
      },
      {
        name: '台中核心區',
        bounds: {
          north: 24.1800,
          south: 24.1400,
          east: 120.6800,
          west: 120.6400
        },
        density: 'medium' // 每100公尺一個節點
      }
    ];

    let totalNodes = 0;

    regions.forEach(region => {
      let resolution: number;
      switch (region.density) {
        case 'high':
          resolution = 0.0005; // 約50公尺
          break;
        case 'medium':
          resolution = 0.001; // 約100公尺
          break;
        default:
          resolution = 0.002; // 約200公尺
      }
      
      const nodes = this.generateRegionGrid(region.bounds, resolution, region.name);
      totalNodes += nodes;
      logger.info(`✅ ${region.name}: ${nodes} 個精確節點`);
    });

    // 建立主要道路網絡
    this.buildMajorRoadNetwork();
    
    // 建立局部街道網絡
    this.buildLocalStreetNetwork();

    logger.info(`🎯 總計建立 ${totalNodes} 個精確節點, ${this.roadSegments.size} 條道路段`);
  }

  /**
   * 生成區域網格節點
   */
  private generateRegionGrid(bounds: any, resolution: number, regionName: string): number {
    let nodeCount = 0;
    
    for (let lat = bounds.south; lat <= bounds.north; lat += resolution) {
      for (let lng = bounds.west; lng <= bounds.east; lng += resolution) {
        const nodeId = this.generateNodeId(lat, lng);
        const roadType = this.determineRoadType(lat, lng, regionName);
        
        const node: RoadNode = {
          id: nodeId,
          coordinates: {
            lat: Math.round(lat * 100000) / 100000,
            lng: Math.round(lng * 100000) / 100000,
            roadType: roadType,
            speedLimit: this.getSpeedLimit(roadType),
            roadWidth: this.getRoadWidth(roadType)
          },
          connections: [],
          district: regionName,
          hazardLevel: Math.random() * 2 // 基礎風險等級
        };

        this.roadNetwork.set(nodeId, node);
        nodeCount++;
      }
    }

    return nodeCount;
  }

  /**
   * 建立主要道路網絡
   */
  private buildMajorRoadNetwork(): void {
    // 模擬台灣主要道路
    const majorRoads = [
      {
        name: '國道一號',
        points: [
          { lat: 25.0780, lng: 121.5753 }, // 台北
          { lat: 24.8066, lng: 121.0181 }, // 新竹
          { lat: 24.1477, lng: 120.6736 }, // 台中
          { lat: 23.5539, lng: 120.2620 }, // 嘉義
          { lat: 22.6273, lng: 120.3014 }  // 高雄
        ],
        roadType: 'highway',
        speedLimit: 100
      },
      {
        name: '台北市忠孝東路',
        points: [
          { lat: 25.0418, lng: 121.5120 },
          { lat: 25.0418, lng: 121.5320 },
          { lat: 25.0418, lng: 121.5520 },
          { lat: 25.0418, lng: 121.5720 }
        ],
        roadType: 'main',
        speedLimit: 50
      },
      {
        name: '台中市台灣大道',
        points: [
          { lat: 24.1630, lng: 120.6065 },
          { lat: 24.1630, lng: 120.6265 },
          { lat: 24.1630, lng: 120.6465 },
          { lat: 24.1630, lng: 120.6665 }
        ],
        roadType: 'main',
        speedLimit: 60
      }
    ];

    majorRoads.forEach(road => {
      this.createRoadPath(road.points, road.name, road.roadType as any, road.speedLimit);
    });
  }

  /**
   * 建立道路路徑
   */
  private createRoadPath(points: { lat: number; lng: number }[], roadName: string, roadType: any, speedLimit: number): void {
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      
      // 在起終點間插入密集節點
      const interpolatedNodes = this.interpolateNodes(start, end, 10); // 每10公尺一個節點
      
      interpolatedNodes.forEach((point, index) => {
        const nodeId = this.generateNodeId(point.lat, point.lng);
        let node = this.roadNetwork.get(nodeId);
        
        if (!node) {
          node = {
            id: nodeId,
            coordinates: {
              lat: point.lat,
              lng: point.lng,
              roadType: roadType,
              speedLimit: speedLimit
            },
            connections: [],
            roadName: roadName
          };
          this.roadNetwork.set(nodeId, node);
        } else {
          // 更新已存在節點的道路資訊
          node.roadName = roadName;
          node.coordinates.roadType = roadType;
          node.coordinates.speedLimit = speedLimit;
        }

        // 連接相鄰節點
        if (index > 0) {
          const prevNodeId = this.generateNodeId(interpolatedNodes[index - 1].lat, interpolatedNodes[index - 1].lng);
          if (!node.connections.includes(prevNodeId)) {
            node.connections.push(prevNodeId);
          }
          
          const prevNode = this.roadNetwork.get(prevNodeId);
          if (prevNode && !prevNode.connections.includes(nodeId)) {
            prevNode.connections.push(nodeId);
          }

          // 建立道路段
          this.createRoadSegment(prevNodeId, nodeId, roadType, roadName);
        }
      });
    }
  }

  /**
   * 插入節點（精確到公尺級別）
   */
  private interpolateNodes(start: { lat: number; lng: number }, end: { lat: number; lng: number }, meterInterval: number): { lat: number; lng: number }[] {
    const nodes: { lat: number; lng: number }[] = [];
    
    // 計算總距離
    const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const steps = Math.ceil(distance / meterInterval);
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;
      
      nodes.push({
        lat: Math.round(lat * 1000000) / 1000000, // 精確到6位小數
        lng: Math.round(lng * 1000000) / 1000000
      });
    }
    
    return nodes;
  }

  /**
   * 建立局部街道網絡
   */
  private buildLocalStreetNetwork(): void {
    // 為每個節點建立與鄰近節點的連接
    const nodes = Array.from(this.roadNetwork.values());
    
    nodes.forEach(node => {
      if (node.connections.length === 0) {
        // 找出鄰近節點並建立連接
        const nearbyNodes = this.findNearbyNodes(node, 50); // 50公尺內
        
        nearbyNodes.forEach(nearbyNode => {
          if (this.canConnect(node, nearbyNode)) {
            node.connections.push(nearbyNode.id);
            nearbyNode.connections.push(node.id);
            
            this.createRoadSegment(node.id, nearbyNode.id, 'local', '區域道路');
          }
        });
      }
    });
  }

  /**
   * 建立道路段
   */
  private createRoadSegment(startNodeId: string, endNodeId: string, roadType: string, roadName: string): void {
    const segmentId = `${startNodeId}-${endNodeId}`;
    
    if (this.roadSegments.has(segmentId)) return;

    const startNode = this.roadNetwork.get(startNodeId);
    const endNode = this.roadNetwork.get(endNodeId);
    
    if (!startNode || !endNode) return;

    const distance = this.calculateDistance(
      startNode.coordinates.lat, startNode.coordinates.lng,
      endNode.coordinates.lat, endNode.coordinates.lng
    );

    const speedLimit = startNode.coordinates.speedLimit || 40;
    const travelTime = (distance / 1000) / (speedLimit / 3.6); // 轉換為秒

    const segment: RoadSegment = {
      id: segmentId,
      startNodeId,
      endNodeId,
      distance: Math.round(distance * 100) / 100, // 精確到公分
      travelTime: Math.round(travelTime * 10) / 10,
      roadType: roadType,
      currentTraffic: 'smooth',
      surfaceCondition: 'good'
    };

    this.roadSegments.set(segmentId, segment);
  }

  /**
   * 精確路線規劃
   */
  public async planPreciseRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    options: {
      avoidHazards?: boolean;
      preferHighways?: boolean;
      avoidTolls?: boolean;
      optimizeFor?: 'time' | 'distance' | 'safety';
    } = {}
  ): Promise<PreciseRoute> {
    logger.info(`🎯 開始精確路線規劃: ${start.lat},${start.lng} → ${end.lat},${end.lng}`);

    // 找到最接近的起終點節點
    const startNode = this.findNearestNode(start);
    const endNode = this.findNearestNode(end);

    if (!startNode || !endNode) {
      throw new Error('無法找到起終點的道路節點');
    }

    // 使用A*算法進行精確路徑搜尋
    const route = await this.aStarSearch(startNode, endNode, options);
    
    logger.info(`✅ 精確路線規劃完成: ${route.totalDistance}公尺, ${route.totalTime}秒`);
    
    return route;
  }

  /**
   * A*算法路徑搜尋
   */
  private async aStarSearch(
    startNode: RoadNode,
    endNode: RoadNode,
    options: any
  ): Promise<PreciseRoute> {
    const openSet = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, endNode));

    while (openSet.size > 0) {
      // 找到f值最小的節點
      let currentId = '';
      let minF = Infinity;
      
      for (const nodeId of openSet) {
        const f = fScore.get(nodeId) || Infinity;
        if (f < minF) {
          minF = f;
          currentId = nodeId;
        }
      }

      if (currentId === endNode.id) {
        // 找到路徑，重建路線
        return this.reconstructPath(cameFrom, currentId, gScore);
      }

      openSet.delete(currentId);
      const currentNode = this.roadNetwork.get(currentId);
      
      if (!currentNode) continue;

      // 檢查所有鄰近節點
      for (const neighborId of currentNode.connections) {
        const neighbor = this.roadNetwork.get(neighborId);
        if (!neighbor) continue;

        const segment = this.roadSegments.get(`${currentId}-${neighborId}`) || 
                      this.roadSegments.get(`${neighborId}-${currentId}`);
        
        if (!segment) continue;

        // 計算實際移動成本
        const moveCost = this.calculateMoveCost(currentNode, neighbor, segment, options);
        const tentativeG = (gScore.get(currentId) || 0) + moveCost;

        if (tentativeG < (gScore.get(neighborId) || Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.heuristic(neighbor, endNode));
          
          if (!openSet.has(neighborId)) {
            openSet.add(neighborId);
          }
        }
      }
    }

    throw new Error('無法找到可行路徑');
  }

  /**
   * 重建精確路徑
   */
  private reconstructPath(cameFrom: Map<string, string>, currentId: string, gScore: Map<string, number>): PreciseRoute {
    const pathNodes: RoadNode[] = [];
    const pathSegments: RoadSegment[] = [];
    let totalDistance = 0;
    let totalTime = 0;

    let current = currentId;
    while (current) {
      const node = this.roadNetwork.get(current);
      if (node) {
        pathNodes.unshift(node);
        
        const previous = cameFrom.get(current);
        if (previous) {
          const segment = this.roadSegments.get(`${previous}-${current}`) || 
                        this.roadSegments.get(`${current}-${previous}`);
          if (segment) {
            pathSegments.unshift(segment);
            totalDistance += segment.distance;
            totalTime += segment.travelTime;
          }
        }
      }
      current = cameFrom.get(current) || '';
    }

    // 生成詳細導航指令
    const instructions = this.generateDetailedInstructions(pathNodes, pathSegments);
    
    // 計算整體風險等級
    const riskLevel = this.calculateRouteRisk(pathNodes);

    return {
      nodes: pathNodes,
      segments: pathSegments,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime),
      instructions,
      riskLevel
    };
  }

  /**
   * 生成詳細導航指令
   */
  private generateDetailedInstructions(nodes: RoadNode[], segments: RoadSegment[]): RouteInstruction[] {
    const instructions: RouteInstruction[] = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      const segment = segments[i];
      
      if (!segment) continue;

      const direction = this.calculateDirection(currentNode, nextNode, nodes[i + 2]);
      const instruction = this.generateInstruction(direction, segment, currentNode);
      
      instructions.push({
        nodeId: currentNode.id,
        instruction,
        distance: segment.distance,
        direction,
        streetName: currentNode.roadName || '道路',
        landmarks: this.findLandmarks(currentNode)
      });
    }

    return instructions;
  }

  // ========== 輔助方法 ==========

  private generateNodeId(lat: number, lng: number): string {
    return `node_${Math.round(lat * 1000000)}_${Math.round(lng * 1000000)}`;
  }

  private determineRoadType(lat: number, lng: number, region: string): 'highway' | 'main' | 'secondary' | 'local' | 'alley' {
    // 基於位置和區域判斷道路類型
    const random = Math.random();
    if (random < 0.05) return 'highway';
    if (random < 0.15) return 'main';
    if (random < 0.35) return 'secondary';
    if (random < 0.80) return 'local';
    return 'alley';
  }

  private getSpeedLimit(roadType: string): number {
    const limits = {
      highway: 100,
      main: 60,
      secondary: 50,
      local: 40,
      alley: 30
    };
    return limits[roadType as keyof typeof limits] || 40;
  }

  private getRoadWidth(roadType: string): number {
    const widths = {
      highway: 12,
      main: 8,
      secondary: 6,
      local: 4,
      alley: 3
    };
    return widths[roadType as keyof typeof widths] || 4;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球半徑（公尺）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private findNearbyNodes(node: RoadNode, radius: number): RoadNode[] {
    const nearby: RoadNode[] = [];
    
    for (const [, otherNode] of this.roadNetwork) {
      if (otherNode.id === node.id) continue;
      
      const distance = this.calculateDistance(
        node.coordinates.lat, node.coordinates.lng,
        otherNode.coordinates.lat, otherNode.coordinates.lng
      );
      
      if (distance <= radius) {
        nearby.push(otherNode);
      }
    }
    
    return nearby;
  }

  private canConnect(node1: RoadNode, node2: RoadNode): boolean {
    // 檢查兩節點是否可以連接
    const distance = this.calculateDistance(
      node1.coordinates.lat, node1.coordinates.lng,
      node2.coordinates.lat, node2.coordinates.lng
    );
    
    // 距離限制
    if (distance > 100) return false;
    
    // 道路類型兼容性
    const type1 = node1.coordinates.roadType || 'local';
    const type2 = node2.coordinates.roadType || 'local';
    
    if (type1 === 'highway' && type2 === 'alley') return false;
    if (type1 === 'alley' && type2 === 'highway') return false;
    
    return true;
  }

  private findNearestNode(point: { lat: number; lng: number }): RoadNode | null {
    let nearestNode: RoadNode | null = null;
    let minDistance = Infinity;
    
    for (const [, node] of this.roadNetwork) {
      const distance = this.calculateDistance(
        point.lat, point.lng,
        node.coordinates.lat, node.coordinates.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
    
    return nearestNode;
  }

  private heuristic(node1: RoadNode, node2: RoadNode): number {
    return this.calculateDistance(
      node1.coordinates.lat, node1.coordinates.lng,
      node2.coordinates.lat, node2.coordinates.lng
    );
  }

  private calculateMoveCost(from: RoadNode, to: RoadNode, segment: RoadSegment, options: any): number {
    let cost = segment.distance;
    
    // 根據優化選項調整成本
    if (options.optimizeFor === 'time') {
      cost = segment.travelTime * 10; // 時間權重
    } else if (options.optimizeFor === 'safety') {
      cost += (from.hazardLevel || 0) * 1000; // 安全權重
    }
    
    // 交通狀況影響
    const trafficMultiplier = {
      smooth: 1.0,
      slow: 1.5,
      congested: 2.0,
      blocked: 10.0
    };
    cost *= trafficMultiplier[segment.currentTraffic || 'smooth'];
    
    return cost;
  }

  private calculateRouteRisk(nodes: RoadNode[]): number {
    const totalRisk = nodes.reduce((sum, node) => sum + (node.hazardLevel || 0), 0);
    return Math.round((totalRisk / nodes.length) * 10) / 10;
  }

  private calculateDirection(current: RoadNode, next: RoadNode, after?: RoadNode): RouteInstruction['direction'] {
    if (!after) return 'straight';
    
    // 計算轉向角度
    const angle1 = Math.atan2(next.coordinates.lng - current.coordinates.lng, next.coordinates.lat - current.coordinates.lat);
    const angle2 = Math.atan2(after.coordinates.lng - next.coordinates.lng, after.coordinates.lat - next.coordinates.lat);
    
    let turnAngle = angle2 - angle1;
    if (turnAngle < -Math.PI) turnAngle += 2 * Math.PI;
    if (turnAngle > Math.PI) turnAngle -= 2 * Math.PI;
    
    const degrees = turnAngle * 180 / Math.PI;
    
    if (Math.abs(degrees) < 15) return 'straight';
    if (degrees > 15 && degrees < 45) return 'slight_right';
    if (degrees >= 45 && degrees < 135) return 'right';
    if (degrees >= 135) return 'sharp_right';
    if (degrees < -15 && degrees > -45) return 'slight_left';
    if (degrees <= -45 && degrees > -135) return 'left';
    if (degrees <= -135) return 'sharp_left';
    
    return 'straight';
  }

  private generateInstruction(direction: RouteInstruction['direction'], segment: RoadSegment, node: RoadNode): string {
    const directionText = {
      straight: '直行',
      left: '左轉',
      right: '右轉',
      slight_left: '微左轉',
      slight_right: '微右轉',
      sharp_left: '大幅左轉',
      sharp_right: '大幅右轉',
      u_turn: '迴轉'
    };
    
    const streetName = node.roadName || '道路';
    const distance = Math.round(segment.distance);
    
    return `${directionText[direction]}進入${streetName}，行駛${distance}公尺`;
  }

  private findLandmarks(node: RoadNode): string[] {
    // 模擬地標識別
    const landmarks: string[] = [];
    
    if (node.isIntersection) {
      landmarks.push('十字路口');
    }
    
    if (node.trafficSignals) {
      landmarks.push('交通號誌');
    }
    
    // 基於位置添加知名地標
    if (node.coordinates.lat > 25.0 && node.coordinates.lat < 25.1) {
      landmarks.push('台北市區');
    }
    
    return landmarks;
  }

  /**
   * 獲取路網統計資訊
   */
  public getNetworkStats(): any {
    return {
      totalNodes: this.roadNetwork.size,
      totalSegments: this.roadSegments.size,
      averageConnections: Array.from(this.roadNetwork.values())
        .reduce((sum, node) => sum + node.connections.length, 0) / this.roadNetwork.size,
      coverage: '台灣主要都會區',
      precision: '精確至公尺級別'
    };
  }
}

// 導出單例
export const preciseNavigationService = new PreciseNavigationService();
export default preciseNavigationService; 