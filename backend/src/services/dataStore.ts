import { HazardData, UserReport } from '@shared/types';

/**
 * 簡單的記憶體資料儲存
 * 未來可以替換為真實的資料庫
 */
class DataStore {
  private hazards: Map<string, HazardData> = new Map();
  private userReports: Map<string, UserReport> = new Map();
  private lastUpdated: Date = new Date();

  /**
   * 設定所有災害資料
   */
  setHazards(hazards: HazardData[]): void {
    this.hazards.clear();
    hazards.forEach(hazard => {
      this.hazards.set(hazard.id, hazard);
    });
    this.lastUpdated = new Date();
  }

  /**
   * 取得所有災害資料
   */
  getHazards(): HazardData[] {
    return Array.from(this.hazards.values());
  }

  /**
   * 取得單一災害資料
   */
  getHazard(id: string): HazardData | undefined {
    return this.hazards.get(id);
  }

  /**
   * 新增或更新災害資料
   */
  upsertHazard(hazard: HazardData): void {
    this.hazards.set(hazard.id, hazard);
    this.lastUpdated = new Date();
  }

  /**
   * 刪除災害資料
   */
  deleteHazard(id: string): boolean {
    const result = this.hazards.delete(id);
    if (result) {
      this.lastUpdated = new Date();
    }
    return result;
  }

  /**
   * 新增使用者上報
   */
  addUserReport(report: UserReport): UserReport {
    const reportWithId = {
      ...report,
      id: report.id || this.generateReportId(),
      reportedAt: report.reportedAt || new Date().toISOString()
    };
    this.userReports.set(reportWithId.id!, reportWithId);
    return reportWithId;
  }

  /**
   * 取得所有使用者上報
   */
  getUserReports(): UserReport[] {
    return Array.from(this.userReports.values());
  }

  /**
   * 取得單一使用者上報
   */
  getUserReport(id: string): UserReport | undefined {
    return this.userReports.get(id);
  }

  /**
   * 更新使用者上報
   */
  updateUserReport(id: string, updates: Partial<UserReport>): UserReport | undefined {
    const existing = this.userReports.get(id);
    if (!existing) {
      return undefined;
    }
    
    const updated = { ...existing, ...updates, id };
    this.userReports.set(id, updated);
    return updated;
  }

  /**
   * 刪除使用者上報
   */
  deleteUserReport(id: string): boolean {
    return this.userReports.delete(id);
  }

  /**
   * 取得資料最後更新時間
   */
  getLastUpdated(): Date {
    return this.lastUpdated;
  }

  /**
   * 清空所有資料
   */
  clear(): void {
    this.hazards.clear();
    this.userReports.clear();
    this.lastUpdated = new Date();
  }

  /**
   * 取得統計資訊
   */
  getStats() {
    const hazardsByType = new Map<string, number>();
    const hazardsBySeverity = new Map<number, number>();
    
    this.hazards.forEach(hazard => {
      // 按類型統計
      const typeCount = hazardsByType.get(hazard.type) || 0;
      hazardsByType.set(hazard.type, typeCount + 1);
      
      // 按嚴重程度統計
      const severityCount = hazardsBySeverity.get(hazard.severity) || 0;
      hazardsBySeverity.set(hazard.severity, severityCount + 1);
    });

    return {
      totalHazards: this.hazards.size,
      totalReports: this.userReports.size,
      hazardsByType: Object.fromEntries(hazardsByType),
      hazardsBySeverity: Object.fromEntries(hazardsBySeverity),
      lastUpdated: this.lastUpdated.toISOString()
    };
  }

  /**
   * 產生上報 ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 匯出單例實例
export const dataStore = new DataStore(); 