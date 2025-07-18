import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import { useAppStore } from '../hooks/useAppStore';
import { HazardData, SeverityLevel, Coordinates } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin, FiAlertTriangle, FiNavigation } from 'react-icons/fi';
import { mapApi } from '../services/api';
import toast from 'react-hot-toast';

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

// 地圖事件處理元件
function MapEventHandler() {
  const routePlanning = useAppStore((state) => state.routePlanning);
  const setRouteStart = useAppStore((state) => state.setRouteStart);
  const setRouteEnd = useAppStore((state) => state.setRouteEnd);
  const reportMode = useAppStore((state) => state.reportMode);
  const setReportMode = useAppStore((state) => state.setReportMode);

  useMapEvents({
    click: (e) => {
      const location: Coordinates = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      };

      // 如果在上報模式
      if (reportMode.isActive) {
        setReportMode(true, location);
        return;
      }

      // 如果在路線規劃模式
      if (routePlanning.isPlanning) {
        if (!routePlanning.start) {
          setRouteStart(location);
          toast.success('已設定起點');
        } else if (!routePlanning.end) {
          setRouteEnd(location);
          toast.success('已設定終點');
        }
      }
    },
  });

  return null;
}

export function MapView() {
  const [routes, setRoutes] = useState<{
    safest?: Coordinates[];
    fastest?: Coordinates[];
    balanced?: Coordinates[];
  }>({});
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  const mapViewState = useAppStore((state) => state.mapViewState);
  const setMapViewState = useAppStore((state) => state.setMapViewState);
  const hazards = useAppStore((state) => state.hazards);
  const userLocation = useAppStore((state) => state.userLocation);
  const riskAssessment = useAppStore((state) => state.riskAssessment);
  const routePlanning = useAppStore((state) => state.routePlanning);
  const navigation = useAppStore((state) => state.navigation);
  const setIsPlanning = useAppStore((state) => state.setIsPlanning);

  // 計算路線
  useEffect(() => {
    if (routePlanning.start && routePlanning.end && routePlanning.isPlanning) {
      planRoute();
    }
  }, [routePlanning.start, routePlanning.end]);

  const planRoute = async () => {
    if (!routePlanning.start || !routePlanning.end) return;

    setIsLoadingRoute(true);
    try {
      const result = await mapApi.planRoute({
        start: routePlanning.start,
        end: routePlanning.end,
        preferSafety: routePlanning.navigationMode === 'safest',
        avoidHazardTypes: routePlanning.avoidHazardTypes
      });

      setRoutes({
        safest: result.safestRoute?.route,
        fastest: result.fastestRoute?.route,
        balanced: result.balancedRoute?.route
      });

      // 顯示警告
      if (result.safestRoute?.warnings.length) {
        result.safestRoute.warnings.forEach((warning) => {
          toast(warning, { icon: '⚠️', duration: 5000 });
        });
      }

      setIsPlanning(false);
    } catch (error) {
      toast.error('路線規劃失敗');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // 取得風險等級顏色
  const getRiskColor = (level: SeverityLevel) => {
    const colors = {
      [SeverityLevel.LOW]: '#22c55e',
      [SeverityLevel.MEDIUM]: '#facc15',
      [SeverityLevel.HIGH]: '#f97316',
      [SeverityLevel.CRITICAL]: '#ef4444',
    };
    return colors[level];
  };

  // 過濾要顯示的災害
  const filteredHazards = (hazards || []).filter(hazard => {
    // 確保 hazard 物件存在且有必要的屬性
    if (!hazard || !hazard.type) return false;
    
    // 如果正在導航，且選擇了要避開的災害類型
    if (navigation.isActive && routePlanning.avoidHazardTypes.length > 0) {
      return !routePlanning.avoidHazardTypes.includes(hazard.type);
    }
    return true;
  });

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[mapViewState.center.lat, mapViewState.center.lng]}
        zoom={mapViewState.zoom}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* 地圖事件處理 */}
        <MapEventHandler />

        {/* 使用者位置 */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>
              <div className="text-center">
                <FiMapPin className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="font-semibold">您的位置</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 危險熱區 */}
        {mapViewState.showHeatmap && riskAssessment?.affectedAreas?.map((area) => (
          <Polygon
            key={area.id}
            positions={area.polygon.map((p) => [p.lat, p.lng])}
            pathOptions={{
              fillColor: getRiskColor(area.riskLevel),
              fillOpacity: 0.3,
              color: getRiskColor(area.riskLevel),
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold mb-2">風險區域</h3>
                <p>風險等級：{area.riskLevel}/4</p>
                <p>災害數量：{area.hazards?.length || 0}</p>
              </div>
            </Popup>
          </Polygon>
        )) || null}

        {/* 災害標記 */}
        {filteredHazards.map((hazard) => (
          <Marker
            key={hazard.id}
            position={[hazard.location.lat, hazard.location.lng]}
            icon={createHazardIcon(hazard.severity)}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold mb-2">{getHazardTypeName(hazard.type)}</h3>
                <p className="text-sm text-gray-600 mb-2">{hazard.description}</p>
                <div className="text-xs text-gray-500">
                  <p>嚴重程度：{hazard.severity}/4</p>
                  <p>回報時間：{new Date(hazard.reportedAt).toLocaleString()}</p>
                  {hazard.verifiedCount && <p>確認次數：{hazard.verifiedCount}</p>}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 路線規劃標記 */}
        {routePlanning.start && (
          <Marker position={[routePlanning.start.lat, routePlanning.start.lng]}>
            <Popup>起點</Popup>
          </Marker>
        )}
        {routePlanning.end && (
          <Marker position={[routePlanning.end.lat, routePlanning.end.lng]}>
            <Popup>終點</Popup>
          </Marker>
        )}

        {/* 安全路線 */}
        {mapViewState.showRoutes && routes.safest && routePlanning.navigationMode === 'safest' && (
          <Polyline
            positions={routes.safest.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: '#22c55e',
              weight: 6,
              opacity: 0.8,
            }}
          >
            <Popup>最安全路線</Popup>
          </Polyline>
        )}

        {/* 快速路線 */}
        {mapViewState.showRoutes && routes.fastest && routePlanning.navigationMode === 'fastest' && (
          <Polyline
            positions={routes.fastest.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: '#3b82f6',
              weight: 6,
              opacity: 0.8,
            }}
          >
            <Popup>最快路線</Popup>
          </Polyline>
        )}

        {/* 平衡路線 */}
        {mapViewState.showRoutes && routes.balanced && routePlanning.navigationMode === 'balanced' && (
          <Polyline
            positions={routes.balanced.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: '#8b5cf6',
              weight: 6,
              opacity: 0.8,
            }}
          >
            <Popup>平衡路線</Popup>
          </Polyline>
        )}

        {/* 導航中的路線 */}
        {navigation.isActive && navigation.currentRoute && (
          <Polyline
            positions={navigation.currentRoute.map((p) => [p.lat, p.lng])}
            pathOptions={{
              color: '#ef4444',
              weight: 8,
              opacity: 1,
              dashArray: '15, 10',
            }}
          >
            <Popup>正在導航</Popup>
          </Polyline>
        )}
      </MapContainer>

      {/* 地圖控制按鈕 */}
      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <button
          onClick={() => setMapViewState({ showHeatmap: !mapViewState.showHeatmap })}
          className={`bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium transition-colors ${
            mapViewState.showHeatmap ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
        >
          {mapViewState.showHeatmap ? '隱藏' : '顯示'}熱區
        </button>
        <button
          onClick={() => setMapViewState({ showRoutes: !mapViewState.showRoutes })}
          className={`bg-white rounded-lg shadow-lg px-4 py-2 text-sm font-medium transition-colors ${
            mapViewState.showRoutes ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
        >
          {mapViewState.showRoutes ? '隱藏' : '顯示'}路線
        </button>
      </div>

      {/* 載入中提示 */}
      {isLoadingRoute && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">正在規劃路線...</span>
          </div>
        </div>
      )}
    </div>
  );
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