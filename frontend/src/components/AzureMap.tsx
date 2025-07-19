import React, { useEffect, useRef, useState } from 'react';
import { FiMap, FiLayers, FiAlertTriangle, FiEye, FiEyeOff } from 'react-icons/fi';
import { HazardOverlay } from './HazardOverlay';

declare global {
  interface Window {
    atlas: any;
  }
}

interface AzureMapProps {
  routePath?: Array<{ lat: number; lng: number }>;
  startLocation?: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
  className?: string;
}

export function AzureMap({ 
  routePath, 
  startLocation, 
  endLocation, 
  className = '' 
}: AzureMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHazards, setShowHazards] = useState(true);
  const [mapStyle, setMapStyle] = useState('road');

  // 初始化地圖
  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 檢查 Azure Maps SDK 是否已載入
        if (!window.atlas) {
          // 動態載入 Azure Maps SDK
          await loadAzureMapsSDK();
        }

        // 創建地圖實例
        const newMap = new window.atlas.Map(mapContainer.current, {
          center: [121.5654, 25.0330], // 台北101
          zoom: 12,
          style: 'road_shaded_relief',
          language: 'zh-TW',
          authOptions: {
            authType: window.atlas.AuthenticationType.subscriptionKey,
            subscriptionKey: 'demo-key' // 在實際部署時需要真實的key
          }
        });

        // 等待地圖載入完成
        newMap.events.add('ready', () => {
          console.log('🗺️ Azure Maps 載入完成');
          setMap(newMap);
          setIsLoading(false);
        });

        newMap.events.add('error', (error: any) => {
          console.error('❌ Azure Maps 載入錯誤:', error);
          setError('地圖載入失敗，請檢查網路連線');
          setIsLoading(false);
        });

      } catch (err) {
        console.error('❌ 地圖初始化錯誤:', err);
        setError('地圖初始化失敗');
        setIsLoading(false);
      }
    };

    initializeMap();

    // 清理函數
    return () => {
      if (map) {
        map.dispose();
      }
    };
  }, []);

  // 動態載入 Azure Maps SDK
  const loadAzureMapsSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.atlas) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.js';
      script.onload = () => {
        // 載入CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://atlas.microsoft.com/sdk/javascript/mapcontrol/2/atlas.min.css';
        document.head.appendChild(link);
        
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Azure Maps SDK'));
      document.head.appendChild(script);
    });
  };

  // 更新路線顯示
  useEffect(() => {
    if (!map || !routePath) return;

    // 清除現有路線
    map.sources.getAll().forEach((source: any) => {
      if (source.getId().startsWith('route-')) {
        map.sources.remove(source);
      }
    });

    map.layers.getAll().forEach((layer: any) => {
      if (layer.getId && layer.getId().startsWith('route-')) {
        map.layers.remove(layer);
      }
    });

    try {
      // 創建路線數據
      const routeLineString = new window.atlas.data.LineString(
        routePath.map(point => [point.lng, point.lat])
      );

      // 創建數據源
      const routeDataSource = new window.atlas.source.DataSource('route-source');
      routeDataSource.add(new window.atlas.data.Feature(routeLineString));
      map.sources.add(routeDataSource);

      // 創建路線圖層
      const routeLayer = new window.atlas.layer.LineLayer(routeDataSource, 'route-layer', {
        strokeColor: '#2563eb',
        strokeWidth: 6,
        strokeOpacity: 0.8
      });

      map.layers.add(routeLayer);

      // 調整地圖視野以包含整條路線
      const bounds = window.atlas.data.BoundingBox.fromData(routeLineString);
      map.setCamera({
        bounds: bounds,
        padding: 50
      });

    } catch (error) {
      console.error('❌ 路線顯示錯誤:', error);
    }
  }, [map, routePath]);

  // 更新起終點標記
  useEffect(() => {
    if (!map) return;

    // 清除現有標記
    map.sources.getAll().forEach((source: any) => {
      if (source.getId().startsWith('marker-')) {
        map.sources.remove(source);
      }
    });

    map.layers.getAll().forEach((layer: any) => {
      if (layer.getId && layer.getId().startsWith('marker-')) {
        map.layers.remove(layer);
      }
    });

    try {
      // 添加起點標記
      if (startLocation) {
        const startDataSource = new window.atlas.source.DataSource('marker-start');
        const startPoint = new window.atlas.data.Feature(
          new window.atlas.data.Point([startLocation.lng, startLocation.lat]),
          { type: 'start' }
        );
        startDataSource.add(startPoint);
        map.sources.add(startDataSource);

        const startLayer = new window.atlas.layer.SymbolLayer(startDataSource, 'marker-start-layer', {
          iconOptions: {
            image: 'pin-round-green',
            size: 1.2,
            anchor: 'bottom'
          },
          textOptions: {
            textField: '起點',
            offset: [0, -2],
            color: '#ffffff',
            haloColor: '#2563eb',
            haloWidth: 1
          }
        });
        map.layers.add(startLayer);
      }

      // 添加終點標記
      if (endLocation) {
        const endDataSource = new window.atlas.source.DataSource('marker-end');
        const endPoint = new window.atlas.data.Feature(
          new window.atlas.data.Point([endLocation.lng, endLocation.lat]),
          { type: 'end' }
        );
        endDataSource.add(endPoint);
        map.sources.add(endDataSource);

        const endLayer = new window.atlas.layer.SymbolLayer(endDataSource, 'marker-end-layer', {
          iconOptions: {
            image: 'pin-round-red',
            size: 1.2,
            anchor: 'bottom'
          },
          textOptions: {
            textField: '終點',
            offset: [0, -2],
            color: '#ffffff',
            haloColor: '#dc2626',
            haloWidth: 1
          }
        });
        map.layers.add(endLayer);
      }

    } catch (error) {
      console.error('❌ 標記顯示錯誤:', error);
    }
  }, [map, startLocation, endLocation]);

  // 切換地圖樣式
  const handleStyleChange = (style: string) => {
    if (map) {
      map.setStyle({ style });
      setMapStyle(style);
    }
  };

  if (error) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <FiMap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">地圖載入失敗</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
      {/* 地圖容器 */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* 載入指示器 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">正在載入地圖...</p>
          </div>
        </div>
      )}

      {/* 地圖控制面板 */}
      {map && !isLoading && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-y-2">
          {/* 圖層切換 */}
          <div className="flex flex-col gap-1">
            <div className="text-xs font-medium text-gray-700 px-2 py-1">地圖樣式</div>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => handleStyleChange('road')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  mapStyle === 'road' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiMap className="w-3 h-3 mx-auto mb-1" />
                道路
              </button>
              <button
                onClick={() => handleStyleChange('satellite')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  mapStyle === 'satellite' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiLayers className="w-3 h-3 mx-auto mb-1" />
                衛星
              </button>
            </div>
          </div>

          {/* 災害圖層切換 */}
          <div className="border-t pt-2">
            <button
              onClick={() => setShowHazards(!showHazards)}
              className={`w-full px-2 py-2 text-xs rounded transition-colors flex items-center justify-center gap-2 ${
                showHazards 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiAlertTriangle className="w-3 h-3" />
              <span>{showHazards ? '隱藏' : '顯示'}災害</span>
              {showHazards ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}

      {/* 災害覆蓋層 */}
      {map && (
        <HazardOverlay 
          map={map} 
          isVisible={showHazards && !isLoading} 
        />
      )}

      {/* 地圖資訊 */}
      {!isLoading && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <FiMap className="w-3 h-3" />
            <span>Azure Maps • 即時災害監控</span>
            {showHazards && (
              <>
                <span>•</span>
                <FiAlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-red-600">災害警示開啟</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 