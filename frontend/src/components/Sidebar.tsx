import React, { useState } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { SeverityLevel } from '../types';
import { FiAlertTriangle, FiMapPin, FiPlusCircle, FiNavigation, FiSettings, FiBell } from 'react-icons/fi';
import clsx from 'clsx';
import { RecentAlerts } from './RecentAlerts';

export function Sidebar() {
  const riskAssessment = useAppStore((state) => state.riskAssessment);
  const hazards = useAppStore((state) => state.hazards);
  const userReports = useAppStore((state) => state.userReports);
  const setReportMode = useAppStore((state) => state.setReportMode);
  const setIsPlanning = useAppStore((state) => state.setIsPlanning);
  const setRouteStart = useAppStore((state) => state.setRouteStart);
  const setRouteEnd = useAppStore((state) => state.setRouteEnd);

  const getRiskLevelColor = (level: SeverityLevel) => {
    const colors = {
      [SeverityLevel.LOW]: 'text-green-600 bg-green-50',
      [SeverityLevel.MEDIUM]: 'text-yellow-600 bg-yellow-50',
      [SeverityLevel.HIGH]: 'text-orange-600 bg-orange-50',
      [SeverityLevel.CRITICAL]: 'text-red-600 bg-red-50',
    };
    return colors[level];
  };

  const getRiskLevelText = (level: SeverityLevel) => {
    const texts = {
      [SeverityLevel.LOW]: '低風險',
      [SeverityLevel.MEDIUM]: '中風險',
      [SeverityLevel.HIGH]: '高風險',
      [SeverityLevel.CRITICAL]: '極高風險',
    };
    return texts[level];
  };

  const handleStartRoutePlanning = () => {
    setRouteStart(null);
    setRouteEnd(null);
    setIsPlanning(true);
  };

  return (
    <div className="w-96 bg-white shadow-xl h-full flex flex-col">
      {/* 頂部標題 */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800">Stay Our Safe</h1>
        <p className="text-sm text-gray-600 mt-1">災害防護助手</p>
      </div>

      {/* 風險評估摘要 */}
      {riskAssessment && (
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">整體風險評估</h2>
            <span
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                getRiskLevelColor(riskAssessment.overallRisk)
              )}
            >
              {getRiskLevelText(riskAssessment.overallRisk)}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">{riskAssessment.recommendations[0] || '目前無風險評估摘要'}</p>

          {/* 建議事項 */}
          {riskAssessment.recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">安全建議</h3>
              <ul className="space-y-1">
                {riskAssessment.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 功能按鈕 */}
      <div className="p-6 space-y-3">
        <button
          onClick={() => setReportMode(true)}
          className="w-full flex items-center justify-center space-x-2 bg-red-500 text-white rounded-lg px-4 py-3 font-medium hover:bg-red-600 transition-colors"
        >
          <FiPlusCircle className="w-5 h-5" />
          <span>回報災害</span>
        </button>

        <button
          onClick={handleStartRoutePlanning}
          className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-600 transition-colors"
        >
          <FiNavigation className="w-5 h-5" />
          <span>規劃路線</span>
        </button>
      </div>

      {/* 統計資訊 */}
      <div className="p-6 border-t flex-1 overflow-y-auto">
        <h3 className="font-semibold text-gray-800 mb-4">災害統計</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <FiAlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600">災害點</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{hazards.length}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <FiMapPin className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">社群回報</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{userReports.length}</p>
          </div>
        </div>

        {/* 災害類型分布 */}
        {hazards.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3">災害類型分布</h4>
            <div className="space-y-2">
              {getHazardTypeStats(hazards).map(({ type, count, percentage }) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{getHazardTypeName(type)}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-10 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 底部設定按鈕 */}
      <div className="p-4 border-t">
        <button className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
          <FiSettings className="w-5 h-5" />
          <span>設定</span>
        </button>
      </div>
    </div>
  );
}

// 計算災害類型統計
function getHazardTypeStats(hazards: any[]) {
  const typeCount: Record<string, number> = {};
  hazards.forEach((hazard) => {
    typeCount[hazard.type] = (typeCount[hazard.type] || 0) + 1;
  });

  const total = hazards.length;
  return Object.entries(typeCount)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

// 取得災害類型名稱
function getHazardTypeName(type: string): string {
  const names: Record<string, string> = {
    flood: '積水',
    roadblock: '道路封閉',
    collapse: '建築倒塌',
    fire: '火災',
    landslide: '土石流',
    other: '其他災害',
  };
  return names[type] || type;
} 