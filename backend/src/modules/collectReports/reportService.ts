import { v4 as uuidv4 } from 'uuid';
import { UserReport, HazardData, HazardType, SeverityLevel } from '@shared/types';
import { dataStore } from '../../services/dataStore';
import { createLogger } from '../../services/logger';

const logger = createLogger('ReportService');

export class ReportService {
  /**
   * 提交新的使用者上報
   */
  async submitReport(reportData: Omit<UserReport, 'id' | 'reportedAt'>): Promise<UserReport> {
    try {
      // 驗證資料
      this.validateReport(reportData);

      // 新增上報
      const report = dataStore.addUserReport({
        ...reportData,
        reportedAt: new Date().toISOString()
      });

      logger.info(`新增使用者上報: ${report.id}`, {
        type: report.type,
        location: report.location
      });

      // 檢查是否需要提升現有災害的嚴重程度
      await this.checkAndUpdateNearbyHazards(report);

      return report;
    } catch (error) {
      logger.error('提交上報失敗:', error);
      throw error;
    }
  }

  /**
   * 取得所有使用者上報
   */
  async getReports(filters?: {
    type?: HazardType;
    startDate?: string;
    endDate?: string;
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  }): Promise<UserReport[]> {
    try {
      let reports = dataStore.getUserReports();

      // 套用過濾條件
      if (filters) {
        reports = this.applyFilters(reports, filters);
      }

      // 按時間排序（最新的在前）
      reports.sort((a, b) => {
        const dateA = new Date(a.reportedAt || 0).getTime();
        const dateB = new Date(b.reportedAt || 0).getTime();
        return dateB - dateA;
      });

      return reports;
    } catch (error) {
      logger.error('取得上報資料失敗:', error);
      throw error;
    }
  }

  /**
   * 取得單一上報詳情
   */
  async getReport(id: string): Promise<UserReport | null> {
    const report = dataStore.getUserReport(id);
    return report || null;
  }

  /**
   * 更新上報（例如：新增圖片、更新描述）
   */
  async updateReport(id: string, updates: Partial<UserReport>): Promise<UserReport | null> {
    try {
      // 不允許更新某些欄位
      delete updates.id;
      delete updates.reportedAt;
      delete updates.reporterId;

      const updatedReport = dataStore.updateUserReport(id, updates);
      
      if (updatedReport) {
        logger.info(`更新使用者上報: ${id}`);
      }

      return updatedReport || null;
    } catch (error) {
      logger.error(`更新上報失敗 ${id}:`, error);
      throw error;
    }
  }

  /**
   * 刪除上報
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      const result = dataStore.deleteUserReport(id);
      
      if (result) {
        logger.info(`刪除使用者上報: ${id}`);
      }

      return result;
    } catch (error) {
      logger.error(`刪除上報失敗 ${id}:`, error);
      throw error;
    }
  }

  /**
   * 將多個使用者上報合併為正式災害資料
   */
  async promoteToHazard(reportIds: string[]): Promise<HazardData | null> {
    try {
      const reports = reportIds
        .map(id => dataStore.getUserReport(id))
        .filter((report): report is UserReport => report !== undefined);

      if (reports.length === 0) {
        return null;
      }

      // 計算平均位置
      const avgLat = reports.reduce((sum, r) => sum + r.location.lat, 0) / reports.length;
      const avgLng = reports.reduce((sum, r) => sum + r.location.lng, 0) / reports.length;

      // 決定災害類型（取最常見的）
      const typeCount = new Map<HazardType, number>();
      reports.forEach(r => {
        const count = typeCount.get(r.type) || 0;
        typeCount.set(r.type, count + 1);
      });
      
      let mostCommonType: HazardType = HazardType.OTHER;
      let maxCount = 0;
      typeCount.forEach((count, type) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonType = type as HazardType;
        }
      });

      // 根據上報數量決定嚴重程度
      const severity = this.calculateSeverityFromReportCount(reports.length);

      // 合併描述
      const descriptions = reports.map(r => r.description).filter(d => d);
      const combinedDescription = descriptions.join('；');

      // 建立新的災害資料
      const hazard: HazardData = {
        id: uuidv4(),
        type: mostCommonType,
        severity,
        location: { lat: avgLat, lng: avgLng },
        description: combinedDescription || '社群回報的災害事件',
        source: 'community',
        reportedAt: new Date().toISOString(),
        verifiedCount: reports.length,
        affectedRadius: 500 + (reports.length * 100), // 根據上報數量擴大影響範圍
        images: reports.flatMap(r => r.images || [])
      };

      // 儲存災害資料
      dataStore.upsertHazard(hazard);

      // 刪除已合併的上報
      reportIds.forEach(id => dataStore.deleteUserReport(id));

      logger.info(`將 ${reports.length} 個上報合併為災害: ${hazard.id}`);

      return hazard;
    } catch (error) {
      logger.error('提升為災害失敗:', error);
      throw error;
    }
  }

  /**
   * 取得附近的相似上報（用於自動合併）
   */
  async findSimilarReports(report: UserReport, radius: number = 1000): Promise<UserReport[]> {
    const allReports = dataStore.getUserReports();
    
    return allReports.filter(r => {
      if (r.id === report.id) return false;
      if (r.type !== report.type) return false;
      
      // 計算距離
      const distance = this.calculateDistance(
        report.location.lat,
        report.location.lng,
        r.location.lat,
        r.location.lng
      );
      
      // 檢查時間差（24小時內）
      const timeDiff = Math.abs(
        new Date(report.reportedAt || 0).getTime() - 
        new Date(r.reportedAt || 0).getTime()
      );
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      return distance <= radius && hoursDiff <= 24;
    });
  }

  /**
   * 驗證上報資料
   */
  private validateReport(report: Omit<UserReport, 'id' | 'reportedAt'>): void {
    if (!report.type) {
      throw new Error('災害類型為必填');
    }

    if (!report.location || typeof report.location.lat !== 'number' || typeof report.location.lng !== 'number') {
      throw new Error('位置資訊無效');
    }

    if (report.location.lat < -90 || report.location.lat > 90) {
      throw new Error('緯度必須在 -90 到 90 之間');
    }

    if (report.location.lng < -180 || report.location.lng > 180) {
      throw new Error('經度必須在 -180 到 180 之間');
    }

    if (!report.reporterId) {
      throw new Error('上報者 ID 為必填');
    }
  }

  /**
   * 套用過濾條件
   */
  private applyFilters(reports: UserReport[], filters: any): UserReport[] {
    return reports.filter(report => {
      // 類型過濾
      if (filters.type && report.type !== filters.type) {
        return false;
      }

      // 時間範圍過濾
      if (filters.startDate || filters.endDate) {
        const reportDate = new Date(report.reportedAt || 0).getTime();
        if (filters.startDate && reportDate < new Date(filters.startDate).getTime()) {
          return false;
        }
        if (filters.endDate && reportDate > new Date(filters.endDate).getTime()) {
          return false;
        }
      }

      // 地理範圍過濾
      if (filters.bounds) {
        const { north, south, east, west } = filters.bounds;
        if (report.location.lat < south || report.location.lat > north ||
            report.location.lng < west || report.location.lng > east) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 檢查並更新附近的災害
   */
  private async checkAndUpdateNearbyHazards(report: UserReport): Promise<void> {
    const nearbyHazards = dataStore.getHazards().filter(hazard => {
      if (hazard.type !== report.type) return false;
      
      const distance = this.calculateDistance(
        report.location.lat,
        report.location.lng,
        hazard.location.lat,
        hazard.location.lng
      );
      
      return distance <= 1000; // 1公里內
    });

    // 增加驗證次數
    nearbyHazards.forEach(hazard => {
      const updated = {
        ...hazard,
        verifiedCount: (hazard.verifiedCount || 0) + 1
      };

      // 如果驗證次數夠多，可能需要提升嚴重程度
      if (updated.verifiedCount >= 10 && hazard.severity < SeverityLevel.HIGH) {
        updated.severity = hazard.severity + 1 as SeverityLevel;
        logger.info(`提升災害 ${hazard.id} 的嚴重程度至 ${updated.severity}`);
      }

      dataStore.upsertHazard(updated);
    });
  }

  /**
   * 根據上報數量計算嚴重程度
   */
  private calculateSeverityFromReportCount(count: number): SeverityLevel {
    if (count >= 20) return SeverityLevel.CRITICAL;
    if (count >= 10) return SeverityLevel.HIGH;
    if (count >= 5) return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  /**
   * 計算兩點間的距離（公尺）
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
} 