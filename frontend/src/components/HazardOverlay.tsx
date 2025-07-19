import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiMapPin, FiClock, FiInfo } from 'react-icons/fi';

interface HazardData {
  id: string;
  type: 'flood' | 'fire' | 'earthquake' | 'landslide' | 'typhoon';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  radius: number; // 影響半徑（公尺）
  timestamp: string;
  status: 'active' | 'warning' | 'resolved';
  affectedArea?: string;
  casualties?: number;
  evacuated?: number;
}

interface HazardOverlayProps {
  map: any; // Azure Maps 實例
  isVisible: boolean;
}

export function HazardOverlay({ map, isVisible }: HazardOverlayProps) {
  const [hazards, setHazards] = useState<HazardData[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<HazardData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [overlayLayers, setOverlayLayers] = useState<any[]>([]);

  // 模擬災害數據
  const mockHazards: HazardData[] = [
    {
      id: 'h001',
      type: 'flood',
      severity: 'high',
      title: '淡水河流域淹水警報',
      description: '受強降雨影響，淡水河水位持續上升，周邊地區有淹水風險',
      location: {
        lat: 25.1677,
        lng: 121.4406,
        address: '新北市淡水區'
      },
      radius: 2000,
      timestamp: '2025-07-19T08:30:00Z',
      status: 'active',
      affectedArea: '淡水區、八里區',
      evacuated: 150
    },
    {
      id: 'h002',
      type: 'fire',
      severity: 'critical',
      title: '信義區商業大樓火災',
      description: '台北101附近商業大樓發生火災，消防隊正在搶救中',
      location: {
        lat: 25.0338,
        lng: 121.5645,
        address: '台北市信義區'
      },
      radius: 500,
      timestamp: '2025-07-19T10:15:00Z',
      status: 'active',
      casualties: 5,
      evacuated: 200
    },
    {
      id: 'h003',
      type: 'earthquake',
      severity: 'medium',
      title: '花蓮地震影響區域',
      description: '規模5.2地震，震央位於花蓮縣，台北有感',
      location: {
        lat: 25.0478,
        lng: 121.5170,
        address: '台北市中正區'
      },
      radius: 1500,
      timestamp: '2025-07-19T06:45:00Z',
      status: 'warning'
    },
    {
      id: 'h004',
      type: 'landslide',
      severity: 'high',
      title: '北投山區土石流警戒',
      description: '連日大雨導致山坡地不穩定，有土石流風險',
      location: {
        lat: 25.1372,
        lng: 121.5088,
        address: '台北市北投區'
      },
      radius: 1000,
      timestamp: '2025-07-19T07:20:00Z',
      status: 'warning',
      affectedArea: '北投區山區'
    },
    {
      id: 'h005',
      type: 'typhoon',
      severity: 'medium',
      title: '颱風外圍環流影響',
      description: '颱風瑪娃外圍環流影響，東北部有強風豪雨',
      location: {
        lat: 25.0880,
        lng: 121.5239,
        address: '台北市士林區'
      },
      radius: 3000,
      timestamp: '2025-07-19T05:00:00Z',
      status: 'warning',
      affectedArea: '士林區、北投區'
    }
  ];

  // 災害類型配置
  const hazardConfig = {
    flood: {
      color: '#3B82F6',
      icon: '🌊',
      name: '淹水'
    },
    fire: {
      color: '#EF4444',
      icon: '🔥',
      name: '火災'
    },
    earthquake: {
      color: '#8B5CF6',
      icon: '🏔️',
      name: '地震'
    },
    landslide: {
      color: '#F59E0B',
      icon: '⛰️',
      name: '土石流'
    },
    typhoon: {
      color: '#6B7280',
      icon: '🌪️',
      name: '颱風'
    }
  };

  // 嚴重程度配置
  const severityConfig = {
    low: { opacity: 0.2, strokeWidth: 1, priority: 1 },
    medium: { opacity: 0.3, strokeWidth: 2, priority: 2 },
    high: { opacity: 0.4, strokeWidth: 3, priority: 3 },
    critical: { opacity: 0.6, strokeWidth: 4, priority: 4 }
  };

  // 初始化災害數據
  useEffect(() => {
    setHazards(mockHazards);
  }, []);

  // 在地圖上添加災害覆蓋層
  useEffect(() => {
    if (!map || !isVisible) {
      // 如果地圖不可見，移除所有覆蓋層
      overlayLayers.forEach(layer => {
        if (map && map.layers) {
          map.layers.remove(layer);
        }
      });
      setOverlayLayers([]);
      return;
    }

    // 清除現有覆蓋層
    overlayLayers.forEach(layer => {
      if (map.layers) {
        map.layers.remove(layer);
      }
    });

    const newLayers: any[] = [];

    hazards.forEach(hazard => {
      const config = hazardConfig[hazard.type];
      const severity = severityConfig[hazard.severity];

      // 創建圓形覆蓋層
      const circle = new window.atlas.data.Feature(
        new window.atlas.data.Point([hazard.location.lng, hazard.location.lat]),
        {
          hazardId: hazard.id,
          hazardType: hazard.type,
          hazardSeverity: hazard.severity,
          title: hazard.title,
          radius: hazard.radius
        }
      );

      // 創建數據源
      const dataSource = new window.atlas.source.DataSource();
      dataSource.add(circle);

      // 添加到地圖
      map.sources.add(dataSource);

      // 創建圓形圖層
      const circleLayer = new window.atlas.layer.PolygonLayer(dataSource, null, {
        fillColor: config.color,
        fillOpacity: severity.opacity,
        strokeColor: config.color,
        strokeWidth: severity.strokeWidth,
        strokeOpacity: 0.8
      });

      // 添加點擊事件
      map.events.add('click', circleLayer, (e: any) => {
        if (e.shapes && e.shapes.length > 0) {
          const properties = e.shapes[0].getProperties();
          const clickedHazard = hazards.find(h => h.id === properties.hazardId);
          if (clickedHazard) {
            setSelectedHazard(clickedHazard);
          }
        }
      });

      // 添加懸停事件
      map.events.add('mouseover', circleLayer, (e: any) => {
        if (e.shapes && e.shapes.length > 0) {
          const properties = e.shapes[0].getProperties();
          const hoveredHazard = hazards.find(h => h.id === properties.hazardId);
          if (hoveredHazard) {
            setSelectedHazard(hoveredHazard);
            setShowTooltip(true);
            setTooltipPosition({ x: e.pixel[0], y: e.pixel[1] });
          }
        }
      });

      // 添加離開懸停事件
      map.events.add('mouseleave', circleLayer, () => {
        setShowTooltip(false);
      });

      map.layers.add(circleLayer);
      newLayers.push({ layer: circleLayer, source: dataSource });

      // 添加標記圖層
      const symbolLayer = new window.atlas.layer.SymbolLayer(dataSource, null, {
        iconOptions: {
          image: 'pin-red',
          size: 0.8,
          allowOverlap: true
        },
        textOptions: {
          textField: config.icon,
          size: 16,
          offset: [0, -1],
          allowOverlap: true
        }
      });

      map.layers.add(symbolLayer);
      newLayers.push({ layer: symbolLayer, source: dataSource });
    });

    setOverlayLayers(newLayers);

    // 清理函數
    return () => {
      newLayers.forEach(({ layer, source }) => {
        if (map.layers) {
          map.layers.remove(layer);
        }
        if (map.sources) {
          map.sources.remove(source);
        }
      });
    };
  }, [map, isVisible, hazards]);

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 獲取狀態顯示配置
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'text-red-600', bg: 'bg-red-100', label: '進行中' };
      case 'warning':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: '警戒中' };
      case 'resolved':
        return { color: 'text-green-600', bg: 'bg-green-100', label: '已解除' };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-100', label: '未知' };
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* 懸停提示框 */}
      {showTooltip && selectedHazard && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">
                {hazardConfig[selectedHazard.type].icon}
              </span>
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800">
                  {selectedHazard.title}
                </div>
                <div className="text-xs text-gray-500">
                  {hazardConfig[selectedHazard.type].name} • {formatTime(selectedHazard.timestamp)}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600">
              點擊查看詳細資訊
            </div>
          </div>
        </div>
      )}

      {/* 詳細資訊彈窗 */}
      {selectedHazard && !showTooltip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* 標題欄 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{ backgroundColor: hazardConfig[selectedHazard.type].color + '20' }}>
                  <span className="text-xl">
                    {hazardConfig[selectedHazard.type].icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">
                    {hazardConfig[selectedHazard.type].name}災害詳情
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusConfig(selectedHazard.status).bg} ${getStatusConfig(selectedHazard.status).color}`}>
                      {getStatusConfig(selectedHazard.status).label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(selectedHazard.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedHazard(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 內容區 */}
            <div className="p-4 space-y-4">
              {/* 災害標題和描述 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">
                  {selectedHazard.title}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedHazard.description}
                </p>
              </div>

              {/* 位置資訊 */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <FiMapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-800">
                    {selectedHazard.location.address}
                  </div>
                  <div className="text-xs text-gray-500">
                    座標: {selectedHazard.location.lat.toFixed(4)}, {selectedHazard.location.lng.toFixed(4)}
                  </div>
                  <div className="text-xs text-gray-500">
                    影響半徑: {(selectedHazard.radius / 1000).toFixed(1)} 公里
                  </div>
                </div>
              </div>

              {/* 統計資訊 */}
              {(selectedHazard.casualties || selectedHazard.evacuated || selectedHazard.affectedArea) && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-800">災害統計</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedHazard.casualties && (
                      <div className="p-2 bg-red-50 rounded-lg">
                        <div className="text-xs text-red-600">傷亡人數</div>
                        <div className="font-bold text-red-700">
                          {selectedHazard.casualties} 人
                        </div>
                      </div>
                    )}
                    {selectedHazard.evacuated && (
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <div className="text-xs text-orange-600">疏散人數</div>
                        <div className="font-bold text-orange-700">
                          {selectedHazard.evacuated} 人
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedHazard.affectedArea && (
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <div className="text-xs text-blue-600">影響區域</div>
                      <div className="font-medium text-blue-700">
                        {selectedHazard.affectedArea}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 嚴重程度 */}
              <div>
                <h5 className="text-sm font-medium text-gray-800 mb-2">嚴重程度</h5>
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded ${
                          level <= severityConfig[selectedHazard.severity].priority
                            ? 'bg-red-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 capitalize">
                    {selectedHazard.severity === 'low' && '低'}
                    {selectedHazard.severity === 'medium' && '中等'}
                    {selectedHazard.severity === 'high' && '高'}
                    {selectedHazard.severity === 'critical' && '極高'}
                  </span>
                </div>
              </div>

              {/* 時間資訊 */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <FiClock className="w-4 h-4" />
                <span>最後更新: {formatTime(selectedHazard.timestamp)}</span>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedHazard(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  關閉
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={() => {
                    // 這裡可以添加查看更多詳情的功能
                    alert('導向官方災害資訊頁面');
                  }}
                >
                  更多資訊
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 災害圖例 */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-40 max-w-xs">
        <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-2">
          <FiInfo className="w-4 h-4" />
          災害圖例
        </h4>
        <div className="space-y-1">
          {Object.entries(hazardConfig).map(([type, config]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full border"
                style={{ 
                  backgroundColor: config.color + '40',
                  borderColor: config.color
                }}
              />
              <span>{config.icon}</span>
              <span className="text-gray-600">{config.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          點擊圓圈查看詳情
        </div>
      </div>
    </>
  );
} 