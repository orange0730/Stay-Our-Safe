import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { HazardData, HazardType, SeverityLevel } from '../types';
import { FiAlertTriangle, FiMapPin, FiClock, FiChevronRight, FiGrid } from 'react-icons/fi';
import clsx from 'clsx';

interface DisasterSummaryProps {
  onViewDetails: () => void;
}

export function DisasterSummary({ onViewDetails }: DisasterSummaryProps) {
  const hazards = useAppStore((state) => state.hazards);
  const [selectedHazard, setSelectedHazard] = useState<HazardData | null>(null);

  // 按嚴重程度排序
  const sortedHazards = [...hazards].sort((a, b) => b.severity - a.severity);

  // 統計資料
  const stats = {
    total: hazards.length,
    critical: hazards.filter(h => h.severity === SeverityLevel.CRITICAL).length,
    high: hazards.filter(h => h.severity === SeverityLevel.HIGH).length,
    medium: hazards.filter(h => h.severity === SeverityLevel.MEDIUM).length,
    low: hazards.filter(h => h.severity === SeverityLevel.LOW).length,
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return 'bg-red-100 text-red-800 border-red-200';
      case SeverityLevel.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case SeverityLevel.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case SeverityLevel.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case SeverityLevel.CRITICAL: return '極高';
      case SeverityLevel.HIGH: return '高';
      case SeverityLevel.MEDIUM: return '中';
      case SeverityLevel.LOW: return '低';
      default: return '未知';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case HazardType.FLOOD: return '🌊';
      case HazardType.FIRE: return '🔥';
      case HazardType.LANDSLIDE: return '⛰️';
      case HazardType.ROADBLOCK: return '🚧';
      case HazardType.COLLAPSE: return '🏚️';
      default: return '⚠️';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case HazardType.FLOOD: return '積水';
      case HazardType.FIRE: return '火災';
      case HazardType.LANDSLIDE: return '土石流';
      case HazardType.ROADBLOCK: return '封路';
      case HazardType.COLLAPSE: return '倒塌';
      default: return '其他';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} 小時前`;
    return date.toLocaleDateString('zh-TW');
  };

  return (
    <div className="h-full flex flex-col">
      {/* 標題區 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">近期災害資訊</h2>
          <button
            onClick={onViewDetails}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <FiGrid />
            詳細檢視
          </button>
        </div>

        {/* 統計摘要 */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className={clsx('p-2 rounded-lg border', stats.critical > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50')}>
            <div className="text-lg font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-gray-600">極高風險</div>
          </div>
          <div className={clsx('p-2 rounded-lg border', stats.high > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50')}>
            <div className="text-lg font-bold text-orange-600">{stats.high}</div>
            <div className="text-xs text-gray-600">高風險</div>
          </div>
          <div className={clsx('p-2 rounded-lg border', stats.medium > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50')}>
            <div className="text-lg font-bold text-yellow-600">{stats.medium}</div>
            <div className="text-xs text-gray-600">中風險</div>
          </div>
          <div className={clsx('p-2 rounded-lg border', stats.low > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50')}>
            <div className="text-lg font-bold text-green-600">{stats.low}</div>
            <div className="text-xs text-gray-600">低風險</div>
          </div>
        </div>
      </div>

      {/* 災害列表 */}
      <div className="flex-1 overflow-y-auto">
        {sortedHazards.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FiAlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>目前沒有災害資訊</p>
          </div>
        ) : (
          <div className="p-2">
            {sortedHazards.map((hazard) => (
              <div
                key={hazard.id}
                className={clsx(
                  'mb-2 p-3 rounded-lg border cursor-pointer transition-all',
                  'hover:shadow-md',
                  selectedHazard?.id === hazard.id ? 'ring-2 ring-blue-400' : '',
                  getSeverityColor(hazard.severity)
                )}
                onClick={() => setSelectedHazard(hazard)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{getTypeIcon(hazard.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {getTypeLabel(hazard.type)}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                        {getSeverityLabel(hazard.severity)}風險
                      </span>
                    </div>
                    
                    <p className="text-sm mb-2 line-clamp-2">
                      {hazard.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs opacity-75">
                      <div className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatTime(hazard.reportedAt)}
                      </div>
                      {hazard.verifiedCount && hazard.verifiedCount > 0 && (
                        <span>已確認 {hazard.verifiedCount} 次</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選中的災害詳情 */}
      {selectedHazard && (
        <div className="border-t p-4 bg-gray-50">
          <h3 className="font-medium mb-2">詳細資訊</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <FiMapPin className="w-4 h-4 text-gray-500" />
              <span>
                座標：{selectedHazard.location.lat.toFixed(4)}, {selectedHazard.location.lng.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">來源：</span>
              {selectedHazard.source === 'government' ? '政府通報' : '社群回報'}
            </div>
            {selectedHazard.affectedRadius && (
              <div>
                <span className="text-gray-600">影響範圍：</span>
                {selectedHazard.affectedRadius} 公尺
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 