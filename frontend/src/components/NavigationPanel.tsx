import React, { useState, useEffect } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { mapApi } from '../services/api';
import { FiMapPin, FiNavigation, FiX, FiCheck, FiAlertTriangle, FiClock, FiShield, FiTarget, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { RoutePlanningResult } from '../types';

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
  const [startSuggestions, setStartSuggestions] = useState<any[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<any[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

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

  // 地址搜索
  const searchAddress = async (query: string, isStart: boolean) => {
    if (query.length < 2) {
      if (isStart) setStartSuggestions([]);
      else setEndSuggestions([]);
      return;
    }

    try {
      if (isStart) setIsSearchingStart(true);
      else setIsSearchingEnd(true);

      const result = await mapApi.searchAddress(query);
      
      if (isStart) {
        setStartSuggestions(result.results);
        setShowStartSuggestions(true);
      } else {
        setEndSuggestions(result.results);
        setShowEndSuggestions(true);
      }
    } catch (error) {
      toast.error('地址搜索失敗');
    } finally {
      if (isStart) setIsSearchingStart(false);
      else setIsSearchingEnd(false);
    }
  };

  // 選擇地址建議
  const selectAddressSuggestion = (suggestion: any, isStart: boolean) => {
    if (isStart) {
      setStartAddress(suggestion.address);
      setRouteStart(suggestion.location);
      setStartSuggestions([]);
      setShowStartSuggestions(false);
    } else {
      setEndAddress(suggestion.address);
      setRouteEnd(suggestion.location);
      setEndSuggestions([]);
      setShowEndSuggestions(false);
    }
  };

  // 更新起點終點地址顯示
  useEffect(() => {
    if (routePlanning.start && !startAddress.includes('我的位置')) {
      mapApi.reverseGeocode(routePlanning.start.lat, routePlanning.start.lng)
        .then(address => {
          if (address) setStartAddress(address);
        })
        .catch(() => {
          setStartAddress(`${routePlanning.start!.lat.toFixed(4)}, ${routePlanning.start!.lng.toFixed(4)}`);
        });
    }
  }, [routePlanning.start]);

  useEffect(() => {
    if (routePlanning.end) {
      mapApi.reverseGeocode(routePlanning.end.lat, routePlanning.end.lng)
        .then(address => {
          if (address) setEndAddress(address);
        })
        .catch(() => {
          setEndAddress(`${routePlanning.end!.lat.toFixed(4)}, ${routePlanning.end!.lng.toFixed(4)}`);
        });
    }
  }, [routePlanning.end]);

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
      const result: RoutePlanningResult = await mapApi.planRoute({
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
              onChange={(e) => searchAddress(e.target.value, true)}
              onFocus={() => searchAddress(startAddress, true)}
              onBlur={() => setTimeout(() => setShowStartSuggestions(false), 100)}
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
          {showStartSuggestions && startSuggestions.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto">
              {startSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-2 cursor-pointer hover:bg-blue-50"
                  onClick={() => selectAddressSuggestion(suggestion, true)}
                >
                  {suggestion.address}
                </div>
              ))}
            </div>
          )}
          {isSearchingStart && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto">
              <div className="p-2 text-gray-500">搜尋中...</div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終點</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={endAddress}
              onChange={(e) => searchAddress(e.target.value, false)}
              onFocus={() => searchAddress(endAddress, false)}
              onBlur={() => setTimeout(() => setShowEndSuggestions(false), 100)}
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
          {showEndSuggestions && endSuggestions.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto">
              {endSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-2 cursor-pointer hover:bg-blue-50"
                  onClick={() => selectAddressSuggestion(suggestion, false)}
                >
                  {suggestion.address}
                </div>
              ))}
            </div>
          )}
          {isSearchingEnd && (
            <div className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-full max-h-60 overflow-y-auto">
              <div className="p-2 text-gray-500">搜尋中...</div>
            </div>
          )}
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
        <div className="space-y-3">
          {/* 路線資訊預覽 */}
          {routePlanning.start && routePlanning.end && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-700">路線預覽</span>
                <span className="text-xs text-gray-500">{routePlanning.navigationMode === 'safest' ? '最安全' : routePlanning.navigationMode === 'fastest' ? '最快速' : '平衡'}模式</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-500">起點：</span>
                  <div className="truncate">{startAddress || '未設定'}</div>
                </div>
                <div>
                  <span className="text-gray-500">終點：</span>
                  <div className="truncate">{endAddress || '未設定'}</div>
                </div>
              </div>
              {routePlanning.avoidHazardTypes.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-500">避開：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {routePlanning.avoidHazardTypes.map(type => {
                      const hazard = hazardTypes.find(h => h.id === type);
                      return hazard ? (
                        <span key={type} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-600">
                          {hazard.icon} {hazard.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={calculateRoute}
            disabled={isCalculating || !routePlanning.start || !routePlanning.end}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              isCalculating || !routePlanning.start || !routePlanning.end
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                規劃路線中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FiNavigation className="w-5 h-5" />
                開始導航
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* 導航資訊 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 font-medium text-green-700">
                <FiNavigation className="w-4 h-4" />
                導航中
              </span>
              <span className="text-xs text-green-600">
                {navigation.currentPosition + 1}/{navigation.instructions.length}
              </span>
            </div>
            <div className="text-sm text-green-600">
              正在前往目的地...
            </div>
          </div>

          {/* 導航指示 */}
          <div className="flex-1 bg-gray-50 rounded-lg p-3 mb-3 overflow-y-auto">
            <h3 className="font-medium text-gray-700 mb-2">導航指示</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {navigation.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className={`p-2 rounded transition-all ${
                    index === navigation.currentPosition
                      ? 'bg-blue-100 text-blue-700 font-medium border-l-4 border-blue-500'
                      : index < navigation.currentPosition
                      ? 'bg-green-50 text-green-600 opacity-60'
                      : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold mt-0.5 min-w-[20px]">
                      {index + 1}.
                    </span>
                    <span className="flex-1">{instruction}</span>
                    {index === navigation.currentPosition && (
                      <FiTarget className="w-4 h-4 text-blue-500 mt-0.5" />
                    )}
                    {index < navigation.currentPosition && (
                      <FiCheck className="w-4 h-4 text-green-500 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 導航控制按鈕 */}
          <div className="space-y-2">
            <button
              onClick={() => {
                if (navigation.currentPosition < navigation.instructions.length - 1) {
                  useAppStore.getState().updateNavigationPosition(navigation.currentPosition + 1);
                }
              }}
              disabled={navigation.currentPosition >= navigation.instructions.length - 1}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                navigation.currentPosition >= navigation.instructions.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              下一步 ({navigation.currentPosition + 1}/{navigation.instructions.length})
            </button>
            
            <button
              onClick={stopNavigation}
              className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <FiX className="w-5 h-5" />
              結束導航
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 