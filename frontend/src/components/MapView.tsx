import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import { useAppStore } from '../hooks/useAppStore';
import { HazardData, SeverityLevel, Coordinates } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin, FiAlertTriangle, FiNavigation, FiMap, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { mapApi } from '../services/api';
import toast from 'react-hot-toast';
import { AzureMap } from './AzureMap';

// 修正 Leaflet 圖示問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 定義災害圖示
const createHazardIcon = (severity: SeverityLevel) => {
  const colors = {
    [SeverityLevel.LOW]: '#22c55e',
    [SeverityLevel.MEDIUM]: '#facc15',
    [SeverityLevel.HIGH]: '#f97316',
    [SeverityLevel.CRITICAL]: '#ef4444',
  };

  return L.divIcon({
    html: `
      <div class="relative">
        <div class="absolute -top-3 -left-3 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
          <FiAlertTriangle class="w-4 h-4" style="color: ${colors[severity]}" />
        </div>
      </div>
    `,
    className: 'custom-hazard-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

export function MapView() {
  const [useAzureMap, setUseAzureMap] = useState(true);
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }> | null>(null);
  const [startLocation, setStartLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [endLocation, setEndLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const hazards = useAppStore((state) => state.hazards);
  const routePlanning = useAppStore((state) => state.routePlanning);

  // 監聽路線規劃結果，更新地圖顯示
  useEffect(() => {
    // 這裡暫時使用模擬數據，等待store更新
    if (routePlanning.start && routePlanning.end) {
      // 創建簡單的直線路徑作為示例
      const path = [
        routePlanning.start,
        routePlanning.end
      ];
      setRoutePath(path);
      setStartLocation(routePlanning.start);
      setEndLocation(routePlanning.end);
    }
  }, [routePlanning.start, routePlanning.end]);

  // 地圖切換處理
  const handleMapToggle = () => {
    setUseAzureMap(!useAzureMap);
    toast.success(`已切換至 ${!useAzureMap ? 'Azure Maps' : 'Leaflet'} 地圖`);
  };

  return (
    <div className="relative w-full h-full">
      {/* 地圖切換按鈕 */}
      <div className="absolute top-4 left-4 z-50 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={handleMapToggle}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            useAzureMap 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FiMap className="w-4 h-4" />
          <span className="text-sm font-medium">
            {useAzureMap ? 'Azure Maps' : 'Leaflet'}
          </span>
          {useAzureMap ? (
            <FiToggleRight className="w-5 h-5" />
          ) : (
            <FiToggleLeft className="w-5 h-5" />
          )}
        </button>
        <div className="text-xs text-gray-500 mt-1 px-1">
          {useAzureMap ? '專業級災害監控' : '輕量級地圖顯示'}
        </div>
      </div>

      {/* Azure Maps */}
      {useAzureMap ? (
        <AzureMap
          routePath={routePath || undefined}
          startLocation={startLocation || undefined}
          endLocation={endLocation || undefined}
          className="w-full h-full"
        />
      ) : (
        /* Leaflet 地圖 (備選方案) */
        <LeafletMapView 
          routePath={routePath}
          startLocation={startLocation}
          endLocation={endLocation}
          hazards={hazards}
        />
      )}

      {/* 地圖圖例 */}
      {!useAzureMap && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-40">
          <h4 className="text-sm font-medium text-gray-800 mb-2">圖例</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>極高風險</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>高風險</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>中等風險</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>低風險</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Leaflet 地圖組件
function LeafletMapView({ 
  routePath, 
  startLocation, 
  endLocation, 
  hazards
}: {
  routePath: Array<{ lat: number; lng: number }> | null;
  startLocation: { lat: number; lng: number } | null;
  endLocation: { lat: number; lng: number } | null;
  hazards: HazardData[];
}) {
  // 地圖事件處理元件
  function MapEventHandler() {
    const routePlanning = useAppStore((state) => state.routePlanning);
    const setRouteStart = useAppStore((state) => state.setRouteStart);
    const setRouteEnd = useAppStore((state) => state.setRouteEnd);
    const reportMode = useAppStore((state) => state.reportMode);
    const setReportMode = useAppStore((state) => state.setReportMode);

    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        
        if (reportMode.isActive) {
          // 災害回報模式
          setReportMode(false);
          toast.success('已設定災害回報位置');
        } else if (routePlanning.isPlanning) {
          // 路線規劃模式
          if (!routePlanning.start) {
            setRouteStart({ lat, lng });
            toast.success('已設定起點');
          } else if (!routePlanning.end) {
            setRouteEnd({ lat, lng });
            toast.success('已設定終點');
          }
        }
      }
    });

    return null;
  }

  return (
    <MapContainer
      center={[25.0330, 121.5654]} // 台北市中心
      zoom={12}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapEventHandler />

      {/* 顯示災害資料 */}
      {hazards.map((hazard) => (
        <React.Fragment key={hazard.id}>
          {/* 災害標記 */}
          <Marker
            position={[hazard.location.lat, hazard.location.lng]}
            icon={createHazardIcon(hazard.severity)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm mb-1">{hazard.type}</h3>
                <p className="text-xs text-gray-600 mb-2">{hazard.description}</p>
                <div className="flex justify-between text-xs">
                  <span className={`px-2 py-1 rounded text-white ${
                    hazard.severity === SeverityLevel.CRITICAL ? 'bg-red-500' :
                    hazard.severity === SeverityLevel.HIGH ? 'bg-orange-500' :
                    hazard.severity === SeverityLevel.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    {hazard.severity === SeverityLevel.CRITICAL ? '極高風險' :
                     hazard.severity === SeverityLevel.HIGH ? '高風險' :
                     hazard.severity === SeverityLevel.MEDIUM ? '中等風險' : '低風險'}
                  </span>
                  <span className="text-gray-500">
                    {new Date(hazard.reportedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}

      {/* 顯示路線 */}
      {routePath && routePath.length > 1 && (
        <Polyline
          positions={routePath.map(point => [point.lat, point.lng])}
          pathOptions={{
            color: '#2563eb',
            weight: 5,
            opacity: 0.8
          }}
        />
      )}

      {/* 起點標記 */}
      {startLocation && (
        <Marker
          position={[startLocation.lat, startLocation.lng]}
          icon={L.divIcon({
            html: `
              <div class="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                起
              </div>
            `,
            className: 'custom-start-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })}
        >
          <Popup>起點</Popup>
        </Marker>
      )}

      {/* 終點標記 */}
      {endLocation && (
        <Marker
          position={[endLocation.lat, endLocation.lng]}
          icon={L.divIcon({
            html: `
              <div class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
                終
              </div>
            `,
            className: 'custom-end-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })}
        >
          <Popup>終點</Popup>
        </Marker>
      )}
    </MapContainer>
  );
} 