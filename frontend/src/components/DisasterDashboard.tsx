import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { HazardData, HazardType, SeverityLevel } from '../types';
import { FiAlertTriangle, FiAlertCircle, FiMapPin, FiCalendar, FiFilter } from 'react-icons/fi';
import clsx from 'clsx';

export function DisasterDashboard() {
  const hazards = useAppStore((state) => state.hazards);
  const [selectedSeverity, setSelectedSeverity] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'severity' | 'type'>('severity');

  // 按嚴重程度分組
  const hazardsBySeverity = hazards.reduce((acc, hazard) => {
    const severity = hazard.severity;
    if (!acc[severity]) {
      acc[severity] = [];
    }
    acc[severity].push(hazard);
    return acc;
  }, {} as Record<number, HazardData[]>);

  // 按類型分組
  const hazardsByType = hazards.reduce((acc, hazard) => {
    const type = hazard.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(hazard);
    return acc;
  }, {} as Record<string, HazardData[]>);

  // 過濾災害
  const filteredHazards = hazards.filter(hazard => {
    if (selectedSeverity && hazard.severity !== selectedSeverity) return false;
    if (selectedType && hazard.type !== selectedType) return false;
    return true;
  });

  // 取得嚴重程度的顏色和標籤
  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return 'bg-red-500 text-white';
      case SeverityLevel.HIGH:
        return 'bg-orange-500 text-white';
      case SeverityLevel.MEDIUM:
        return 'bg-yellow-500 text-white';
      case SeverityLevel.LOW:
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return '極高風險';
      case SeverityLevel.HIGH:
        return '高風險';
      case SeverityLevel.MEDIUM:
        return '中風險';
      case SeverityLevel.LOW:
        return '低風險';
      default:
        return '未知';
    }
  };

  // 取得災害類型的圖標和標籤
  const getTypeIcon = (type: string) => {
    switch (type) {
      case HazardType.FLOOD:
        return '🌊';
      case HazardType.FIRE:
        return '🔥';
      case HazardType.LANDSLIDE:
        return '⛰️';
      case HazardType.ROADBLOCK:
        return '🚧';
      case HazardType.COLLAPSE:
        return '🏚️';
      default:
        return '⚠️';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case HazardType.FLOOD:
        return '積水';
      case HazardType.FIRE:
        return '火災';
      case HazardType.LANDSLIDE:
        return '土石流';
      case HazardType.ROADBLOCK:
        return '封路';
      case HazardType.COLLAPSE:
        return '倒塌';
      default:
        return '其他';
    }
  };

  // 渲染單個災害卡片
  const renderHazardCard = (hazard: HazardData) => (
    <div
      key={hazard.id}
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(hazard.type)}</span>
          <div>
            <h4 className="font-semibold">{getTypeLabel(hazard.type)}</h4>
            <p className="text-sm text-gray-600">
              {hazard.source === 'government' ? '政府通報' : '社群回報'}
            </p>
          </div>
        </div>
        <span className={clsx(
          'px-2 py-1 rounded-full text-xs font-medium',
          getSeverityColor(hazard.severity)
        )}>
          {getSeverityLabel(hazard.severity)}
        </span>
      </div>
      
      <p className="text-sm text-gray-700 mb-2">{hazard.description}</p>
      
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <FiMapPin className="w-3 h-3" />
          <span>
            {hazard.location.lat.toFixed(4)}, {hazard.location.lng.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FiCalendar className="w-3 h-3" />
          <span>{new Date(hazard.reportedAt).toLocaleString('zh-TW')}</span>
        </div>
      </div>
      
      {hazard.verifiedCount && hazard.verifiedCount > 0 && (
        <div className="mt-2 text-xs text-blue-600">
          已有 {hazard.verifiedCount} 人確認
        </div>
      )}
    </div>
  );

  // 按嚴重程度分組顯示
  const renderBySeverity = () => (
    <div className="space-y-6">
      {[SeverityLevel.CRITICAL, SeverityLevel.HIGH, SeverityLevel.MEDIUM, SeverityLevel.LOW].map(severity => {
        const hazardsInSeverity = hazardsBySeverity[severity] || [];
        if (hazardsInSeverity.length === 0) return null;
        
        return (
          <div key={severity}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className={clsx(
                'text-lg font-semibold px-3 py-1 rounded-full',
                getSeverityColor(severity)
              )}>
                {getSeverityLabel(severity)}
              </h3>
              <span className="text-gray-600">
                ({hazardsInSeverity.length} 個災害)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hazardsInSeverity.map(renderHazardCard)}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 按類型分組顯示
  const renderByType = () => (
    <div className="space-y-6">
      {Object.values(HazardType).map(type => {
        const hazardsInType = hazardsByType[type] || [];
        if (hazardsInType.length === 0) return null;
        
        return (
          <div key={type}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(type)}</span>
                {getTypeLabel(type)}
              </h3>
              <span className="text-gray-600">
                ({hazardsInType.length} 個災害)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hazardsInType.map(renderHazardCard)}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 標題和統計 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">近期災害資訊</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center shadow">
              <div className="text-3xl font-bold text-red-500">
                {hazardsBySeverity[SeverityLevel.CRITICAL]?.length || 0}
              </div>
              <div className="text-sm text-gray-600">極高風險</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow">
              <div className="text-3xl font-bold text-orange-500">
                {hazardsBySeverity[SeverityLevel.HIGH]?.length || 0}
              </div>
              <div className="text-sm text-gray-600">高風險</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow">
              <div className="text-3xl font-bold text-yellow-500">
                {hazardsBySeverity[SeverityLevel.MEDIUM]?.length || 0}
              </div>
              <div className="text-sm text-gray-600">中風險</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow">
              <div className="text-3xl font-bold text-green-500">
                {hazardsBySeverity[SeverityLevel.LOW]?.length || 0}
              </div>
              <div className="text-sm text-gray-600">低風險</div>
            </div>
          </div>
        </div>

        {/* 篩選和分組控制 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              <span className="font-medium">篩選：</span>
            </div>
            
            {/* 分組方式 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">分組方式：</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'severity' | 'type')}
                className="px-3 py-1 border rounded-lg text-sm"
              >
                <option value="severity">按風險等級</option>
                <option value="type">按災害類型</option>
              </select>
            </div>
            
            {/* 嚴重程度篩選 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">風險等級：</label>
              <select
                value={selectedSeverity || ''}
                onChange={(e) => setSelectedSeverity(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-1 border rounded-lg text-sm"
              >
                <option value="">全部</option>
                <option value={SeverityLevel.CRITICAL}>極高風險</option>
                <option value={SeverityLevel.HIGH}>高風險</option>
                <option value={SeverityLevel.MEDIUM}>中風險</option>
                <option value={SeverityLevel.LOW}>低風險</option>
              </select>
            </div>
            
            {/* 類型篩選 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">災害類型：</label>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
                className="px-3 py-1 border rounded-lg text-sm"
              >
                <option value="">全部</option>
                {Object.values(HazardType).map(type => (
                  <option key={type} value={type}>
                    {getTypeIcon(type)} {getTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="ml-auto text-sm text-gray-600">
              共 {filteredHazards.length} 個災害
            </div>
          </div>
        </div>

        {/* 災害列表 */}
        <div>
          {filteredHazards.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <FiAlertCircle className="w-12 h-12 mx-auto mb-3" />
              <p>沒有符合條件的災害資訊</p>
            </div>
          ) : (
            groupBy === 'severity' ? renderBySeverity() : renderByType()
          )}
        </div>
      </div>
    </div>
  );
} 