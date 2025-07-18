import React, { useEffect, useState } from 'react';
import { AzureMap } from './components/AzureMap';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { ReportModal } from './components/ReportModal';
import { NotificationSystem } from './components/NotificationSystem';
import { LoadingOverlay } from './components/LoadingOverlay';
import { RecentAlerts } from './components/RecentAlerts';
import { AdminDashboard } from './components/AdminDashboard';
import { DisasterDashboard } from './components/DisasterDashboard';
import { DisasterSummary } from './components/DisasterSummary';
import { NavigationPanel } from './components/NavigationPanel';
import { useAppStore } from './hooks/useAppStore';
import { useDataFetch } from './hooks/useDataFetch';
import { useGeolocation } from './hooks/useGeolocation';
import { FiRefreshCw, FiBell, FiSettings, FiGrid, FiNavigation } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface RiskData {
  routes: {
    safe: GeoJSON.LineString;
    fast: GeoJSON.LineString;
  };
  riskLevel: number;
  description: string;
}

function App() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [useAzureMap, setUseAzureMap] = useState(false); // 預設使用 Leaflet 地圖，因為 Azure Maps key 可能缺失
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDisasterDashboard, setShowDisasterDashboard] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const isLoading = useAppStore((state) => state.isLoading);
  const reportMode = useAppStore((state) => state.reportMode);
  const setReportMode = useAppStore((state) => state.setReportMode);

  // 自動取得使用者位置
  useGeolocation();

  // 自動載入資料
  const { refetch: refreshData, isRefetching } = useDataFetch();

  // 取得風險資料
  const fetchRisk = async () => {
    try {
      // 實際環境中應該呼叫 API
      // const response = await fetch('/api/risk');
      // const data = await response.json();
      
      // 暫時使用 mock 資料
      // 設定預設風險資料
    setRiskData({
      routes: {
        safe: { type: 'LineString', coordinates: [] },
        fast: { type: 'LineString', coordinates: [] }
      },
      riskLevel: 0,
      description: '載入中...'
    });
      toast.success('風險資料載入成功');
    } catch (error) {
      console.error('載入風險資料失敗:', error);
      toast.error('載入風險資料失敗');
    }
  };

  // 元件載入時取得風險資料
  useEffect(() => {
    fetchRisk();
  }, []);

  // 處理上報模式
  useEffect(() => {
    if (reportMode.isActive && reportMode.location) {
      setShowReportModal(true);
      setReportMode(false);
    }
  }, [reportMode, setReportMode]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshData(),
        fetchRisk()
      ]);
      toast.success('資料更新成功');
    } catch (error) {
      toast.error('資料更新失敗');
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <NotificationSystem />
      {isLoading && <LoadingOverlay />}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 bg-white shadow-lg z-10">
          <Sidebar />
        </div>
        
        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* 地圖切換按鈕 */}
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2">
            <button
              onClick={() => setUseAzureMap(!useAzureMap)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              切換至 {useAzureMap ? 'Leaflet' : 'Azure'} 地圖
            </button>
          </div>

          {/* 地圖 */}
          {useAzureMap ? (
            <AzureMap 
              safeRoute={riskData?.routes.safe || null}
              fastRoute={riskData?.routes.fast || null}
            />
          ) : (
            <MapView />
          )}

          {/* 功能按鈕組 */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {/* 導航按鈕 */}
            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow"
              title="導航功能"
            >
              <FiNavigation className="w-5 h-5 text-gray-700" />
            </button>

            {/* 警報按鈕 */}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow relative"
              title="顯示警報"
            >
              <FiBell className="w-5 h-5 text-gray-700" />
              {/* 如果有警報，顯示紅點 */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            
            {/* 重新整理按鈕 */}
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              title="重新整理資料"
            >
              <FiRefreshCw 
                className={`w-5 h-5 text-gray-700 ${isRefetching ? 'animate-spin' : ''}`} 
              />
            </button>

            {/* 災害儀表板按鈕 */}
            <button
              onClick={() => setShowDisasterDashboard(true)}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow"
              title="災害資訊儀表板"
            >
              <FiGrid className="w-5 h-5 text-gray-700" />
            </button>

            {/* 後台管理按鈕 */}
            <button
              onClick={() => setShowAdmin(true)}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow"
              title="開啟後台管理"
            >
              <FiSettings className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* 警報面板 */}
          {showAlerts && (
            <div className="absolute top-20 right-4 z-20 w-96 max-h-[calc(100vh-120px)] overflow-y-auto">
              <RecentAlerts />
            </div>
          )}

          {/* 導航面板 */}
          {showNavigation && (
            <div className="absolute top-4 left-4 z-20 w-96 h-[calc(100vh-120px)]">
              <NavigationPanel />
            </div>
          )}

          {/* 載入遮罩 */}
          {isLoading && <LoadingOverlay />}
        </div>
        
        {/* 右側災害資訊面板 */}
        <div className="w-96 bg-white shadow-lg z-10 overflow-hidden">
          <DisasterSummary onViewDetails={() => setShowDisasterDashboard(true)} />
        </div>
      </div>
      
      {/* Modals */}
      {reportMode.isActive && reportMode.location && (
        <ReportModal
          location={reportMode.location}
          onClose={() => {
            setShowReportModal(false);
            setReportMode(false);
          }}
          onSubmit={() => {
            setShowReportModal(false);
            refreshData();
          }}
        />
      )}
      
      {/* 後台管理介面 */}
      {showAdmin && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}
      
      {/* 災害資訊儀表板 */}
      {showDisasterDashboard && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowDisasterDashboard(false)}
              className="bg-white rounded-lg shadow-lg p-3 hover:shadow-xl transition-shadow"
              title="關閉"
            >
              ✕
            </button>
          </div>
          <DisasterDashboard />
        </div>
      )}
    </QueryClientProvider>
  );
}

export default App; 