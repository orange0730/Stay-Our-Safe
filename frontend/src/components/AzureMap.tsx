import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import * as atlas from 'azure-maps-control';
import 'azure-maps-control/dist/atlas.min.css';

interface AzureMapProps {
  center?: [number, number];
  zoom?: number;
  safeRoute?: GeoJSON.LineString | null;
  fastRoute?: GeoJSON.LineString | null;
}

export function AzureMap({ 
  center = [121.5654, 25.0330], // 台北市中心
  zoom = 12,
  safeRoute,
  fastRoute 
}: AzureMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<atlas.Map | null>(null);
  const [showSafeRoute, setShowSafeRoute] = useState(true);
  const safeLayerRef = useRef<atlas.layer.LineLayer | null>(null);
  const fastLayerRef = useRef<atlas.layer.LineLayer | null>(null);

  // 初始化地圖
  useEffect(() => {
    if (!mapRef.current) return;

    // 從環境變數取得 Azure Maps Key
    const azureKey = import.meta.env.VITE_AZURE_MAPS_KEY;
    if (!azureKey) {
      console.warn('Azure Maps key is missing. Please set VITE_AZURE_MAPS_KEY in your .env file');
      // 顯示友善的錯誤訊息而不是讓元件崩潰
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full bg-gray-100 text-gray-600">
            <div class="text-center p-8">
              <div class="mb-4">🗺️</div>
              <h3 class="text-lg font-semibold mb-2">Azure Maps 暫時無法使用</h3>
              <p class="text-sm">請使用 Leaflet 地圖或聯繫系統管理員</p>
            </div>
          </div>
        `;
      }
      return;
    }

    // 建立地圖實例
    const mapInstance = new atlas.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      language: 'zh-TW',
      authOptions: {
        authType: atlas.AuthenticationType.subscriptionKey,
        subscriptionKey: azureKey
      }
    });

    // 等待地圖載入完成
    mapInstance.events.add('ready', () => {
      // 建立資料來源
      const safeDataSource = new atlas.source.DataSource('safe-route');
      const fastDataSource = new atlas.source.DataSource('fast-route');
      
      mapInstance.sources.add(safeDataSource);
      mapInstance.sources.add(fastDataSource);

      // 建立安全路線圖層（綠色實線）
      const safeLayer = new atlas.layer.LineLayer(safeDataSource, 'safe-route-layer', {
        strokeColor: '#22c55e',
        strokeWidth: 5,
        strokeOpacity: 0.8
      });

      // 建立快速路線圖層（藍色虛線）
      const fastLayer = new atlas.layer.LineLayer(fastDataSource, 'fast-route-layer', {
        strokeColor: '#3b82f6',
        strokeWidth: 5,
        strokeOpacity: 0.8,
        strokeDashArray: [5, 5],
        visible: false // 初始隱藏
      });

      // 新增圖層到地圖
      mapInstance.layers.add([safeLayer, fastLayer]);

      // 儲存圖層參考
      safeLayerRef.current = safeLayer;
      fastLayerRef.current = fastLayer;
    });

    setMap(mapInstance);

    // 清理函數
    return () => {
      mapInstance.dispose();
    };
  }, []);

  // 更新路線資料
  useEffect(() => {
    if (!map) return;

    map.events.add('ready', () => {
      // 更新安全路線
      if (safeRoute) {
        const safeSource = map.sources.getById('safe-route') as atlas.source.DataSource;
        if (safeSource) {
          safeSource.clear();
          safeSource.add(new atlas.data.Feature(new atlas.data.LineString(safeRoute.coordinates)));
        }
      }

      // 更新快速路線
      if (fastRoute) {
        const fastSource = map.sources.getById('fast-route') as atlas.source.DataSource;
        if (fastSource) {
          fastSource.clear();
          fastSource.add(new atlas.data.Feature(new atlas.data.LineString(fastRoute.coordinates)));
        }
      }
    });
  }, [map, safeRoute, fastRoute]);

  // 切換路線顯示
  const toggleRoute = (showSafe: boolean) => {
    if (!map || !safeLayerRef.current || !fastLayerRef.current) return;

    setShowSafeRoute(showSafe);
    
    // 切換圖層可見性
    map.layers.setOptions(safeLayerRef.current, { visible: showSafe });
    map.layers.setOptions(fastLayerRef.current, { visible: !showSafe });
  };

  return (
    <div className="relative h-full w-full">
      {/* 地圖容器 */}
      <div ref={mapRef} className="h-full w-full" />

      {/* 路線切換按鈕 */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 space-x-2">
        <button
          onClick={() => toggleRoute(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showSafeRoute 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          顯示最安全路線
        </button>
        <button
          onClick={() => toggleRoute(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showSafeRoute 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          顯示最快速路線
        </button>
      </div>
    </div>
  );
} 