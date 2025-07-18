import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { mapApi } from '../services/api';
import { FiMapPin, FiNavigation, FiX, FiCheck, FiAlertTriangle, FiClock, FiShield, FiTarget } from 'react-icons/fi';
import toast from 'react-hot-toast';

// 災害類型定義
const hazardTypes = [
  { id: 'flood', name: '積水', icon: '💧', color: 'blue' },
  { id: 'roadblock', name: '道路封閉', icon: '🚧', color: 'orange' },
  { id: 'collapse', name: '建築倒塌', icon: '🏚️', color: 'red' },
  { id: 'fire', name: '火災', icon: '🔥', color: 'red' },
  { id: 'landslide', name: '土石流', icon: '⛰️', color: 'brown' },
  { id: 'other', name: '其他災害', icon: '⚠️', color: 'gray' }
];

// 導航模式定義
const navigationModes = [
  { id: 'safest', name: '最安全', icon: FiShield, description: '避開所有危險區域' },
  { id: 'fastest', name: '最快速', icon: FiClock, description: '最短時間到達' },
  { id: 'balanced', name: '平衡', icon: FiTarget, description: '兼顧安全與速度' }
];

export function NavigationPanel() {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const routePlanning = useAppStore((state) => state.routePlanning);
  const navigation = useAppStore((state) => state.navigation);
  const userLocation = useAppStore((state) => state.userLocation);
  const setRouteStart = useAppStore((state) => state.setRouteStart);
  const setRouteEnd = useAppStore((state) => state.setRouteEnd);
  const setIsPlanning = useAppStore((state) => state.setIsPlanning);
  const setAvoidHazardTypes = useAppStore((state) => state.setAvoidHazardTypes);
  const setNavigationMode = useAppStore((state) => state.setNavigationMode);
  const startNavigation = useAppStore((state) => state.startNavigation);
  const stopNavigation = useAppStore((state) => state.stopNavigation);

  // 使用當前位置作為起點
  const useCurrentLocation = () => {
    if (userLocation) {
      setRouteStart(userLocation);
      setStartAddress('我的位置');
      toast.success('已設定當前位置為起點');
    } else {
      toast.error('無法取得您的位置');
    }
  };

  // 在地圖上選擇位置
  const selectOnMap = (type: 'start' | 'end') => {
    setIsPlanning(true);
    toast(`請在地圖上點擊選擇${type === 'start' ? '起點' : '終點'}`, {
      icon: '📍',
      duration: 3000
    });
  };

  // 切換災害類型選擇
  const toggleHazardType = (hazardType: string) => {
    const currentTypes = routePlanning.avoidHazardTypes;
    if (currentTypes.includes(hazardType)) {
      setAvoidHazardTypes(currentTypes.filter(t => t !== hazardType));
    } else {
      setAvoidHazardTypes([...currentTypes, hazardType]);
    }
  };

  // 計算路線
  const calculateRoute = async () => {
    if (!routePlanning.start || !routePlanning.end) {
      toast.error('請設定起點和終點');
      return;
    }

    setIsCalculating(true);
    try {
      const result = await mapApi.planRoute({
        start: routePlanning.start,
        end: routePlanning.end,
        preferSafety: routePlanning.navigationMode === 'safest',
        avoidHazardTypes: routePlanning.avoidHazardTypes
      });

      if (result.safestRoute) {
        // 根據導航模式選擇路線
        const selectedRoute = 
          routePlanning.navigationMode === 'safest' ? result.safestRoute :
          routePlanning.navigationMode === 'fastest' ? result.fastestRoute :
          result.balancedRoute || result.safestRoute;

        if (selectedRoute) {
          startNavigation(selectedRoute.route, selectedRoute.instructions || []);
          toast.success('路線規劃完成！');

          // 顯示警告
          if (selectedRoute.warnings.length > 0) {
            selectedRoute.warnings.forEach((warning: string) => {
              toast(warning, { icon: '⚠️', duration: 5000 });
            });
          }
        }
      }
    } catch (error) {
      toast.error('路線規劃失敗，請稍後再試');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FiNavigation className="text-blue-600" />
        導航功能
      </h2>

      {/* 起點終點輸入 */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">起點</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="輸入地址或在地圖上選擇"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={useCurrentLocation}
              className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              title="使用當前位置"
            >
              <FiMapPin />
            </button>
            <button
              onClick={() => selectOnMap('start')}
              className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="在地圖上選擇"
            >
              📍
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終點</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="輸入地址或在地圖上選擇"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => selectOnMap('end')}
              className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="在地圖上選擇"
            >
              📍
            </button>
          </div>
        </div>
      </div>

      {/* 導航模式選擇 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">導航模式</label>
        <div className="grid grid-cols-3 gap-2">
          {navigationModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => setNavigationMode(mode.id as any)}
              className={`p-2 rounded-lg border transition-all ${
                routePlanning.navigationMode === mode.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <mode.icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">{mode.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 避開災害類型選擇 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">避開災害類型</label>
        <div className="grid grid-cols-3 gap-2">
          {hazardTypes.map(hazard => (
            <button
              key={hazard.id}
              onClick={() => toggleHazardType(hazard.id)}
              className={`p-2 rounded-lg border transition-all text-sm ${
                routePlanning.avoidHazardTypes.includes(hazard.id)
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{hazard.icon}</span>
              {hazard.name}
              {routePlanning.avoidHazardTypes.includes(hazard.id) && (
                <FiX className="inline-block ml-1 w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 開始導航按鈕 */}
      {!navigation.isActive ? (
        <button
          onClick={calculateRoute}
          disabled={isCalculating || !routePlanning.start || !routePlanning.end}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            isCalculating || !routePlanning.start || !routePlanning.end
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              規劃路線中...
            </span>
          ) : (
            '開始導航'
          )}
        </button>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* 導航指示 */}
          <div className="flex-1 bg-gray-50 rounded-lg p-3 mb-3 overflow-y-auto">
            <h3 className="font-medium text-gray-700 mb-2">導航指示</h3>
            <div className="space-y-2">
              {navigation.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    index === navigation.currentPosition
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600'
                  }`}
                >
                  <span className="mr-2">{index + 1}.</span>
                  {instruction}
                </div>
              ))}
            </div>
          </div>

          {/* 結束導航按鈕 */}
          <button
            onClick={stopNavigation}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            結束導航
          </button>
        </div>
      )}
    </div>
  );
} 