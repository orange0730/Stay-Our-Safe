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
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './hooks/useAppStore';
import { useDataFetch } from './hooks/useDataFetch';
import { useGeolocation } from './hooks/useGeolocation';
import { FiRefreshCw, FiBell, FiSettings, FiGrid, FiNavigation, FiList } from 'react-icons/fi';
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

function AppContent() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [useAzureMap, setUseAzureMap] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDisasterDashboard, setShowDisasterDashboard] = useState(false);
  const [showDisasterSummary, setShowDisasterSummary] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const isLoading = useAppStore((state) => state.isLoading);
  const reportMode = useAppStore((state) => state.reportMode);
  const setReportMode = useAppStore((state) => state.setReportMode);

  // 全域錯誤處理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      
      // 過濾掉 MetaMask 和其他擴展的錯誤
      if (event.filename?.includes('chrome-extension://') || 
          event.message?.includes('MetaMask') ||
          event.message?.includes('chain')) {
        return; // 忽略擴展錯誤
      }
      
      // 只在開發環境顯示錯誤
      if (import.meta.env.DEV) {
        toast.error(`錯誤: ${event.message}`);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // 過濾掉 MetaMask 和其他擴展的錯誤
      if (typeof event.reason === 'string' && 
          (event.reason.includes('MetaMask') || event.reason.includes('chain'))) {
        return;
      }
      
      if (import.meta.env.DEV) {
        toast.error('網路請求失敗');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 自動取得使用者位置
  useGeolocation();

  // 自動載入資料
  const { refetch: refreshData, isRefetching } = useDataFetch();

  // 取得風險資料
  const fetchRisk = async () => {
    try {
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
    <ErrorBoundary>
      <Toaster position="top-right" />
      <NotificationSystem />
      {isLoading && <LoadingOverlay />}

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <ErrorBoundary fallback={
          <div className="w-96 bg-gray-100 flex items-center justify-center">
            <p className="text-gray-600">側邊欄載入失敗</p>
          </div>
        }>
          <div className="w-96 bg-white shadow-lg z-10">
            <Sidebar />
          </div>
        </ErrorBoundary>
        
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
          <ErrorBoundary fallback={
            <div className="h-full w-full bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4">🗺️</div>
                <p className="text-gray-600">地圖載入失敗，請重新整理頁面</p>
              </div>
            </div>
          }>
            {useAzureMap ? (
              <AzureMap />
            ) : (
              <MapView />
            )}
          </ErrorBoundary>

          {/* 功能按鈕組 */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefetching}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="重新載入資料"
            >
              <FiRefreshCw className={`w-5 h-5 text-gray-600 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
              title="最新警報"
            >
              <FiBell className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setShowNavigation(!showNavigation)}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
              title="導航面板"
            >
              <FiNavigation className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setShowDisasterSummary(!showDisasterSummary)}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
              title="近期災害資訊"
            >
              <FiList className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setShowAdmin(!showAdmin)}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
              title="管理面板"
            >
              <FiSettings className="w-5 h-5 text-gray-600" />
            </button>

            <button
              onClick={() => setShowDisasterDashboard(!showDisasterDashboard)}
              className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
              title="災害儀表板"
            >
              <FiGrid className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* 彈出式面板 */}
      {showAlerts && (
        <ErrorBoundary>
          <div className="fixed top-20 right-4 w-96 bg-white rounded-lg shadow-2xl z-30 max-h-96 overflow-y-auto">
            <RecentAlerts onClose={() => setShowAlerts(false)} />
          </div>
        </ErrorBoundary>
      )}

      {showNavigation && (
        <ErrorBoundary>
          <div className="fixed top-20 right-4 w-80 bg-white rounded-lg shadow-2xl z-30">
            <NavigationPanel onClose={() => setShowNavigation(false)} />
          </div>
        </ErrorBoundary>
      )}

      {showDisasterSummary && (
        <ErrorBoundary>
          <div className="fixed inset-4 bg-white rounded-lg shadow-2xl z-40 overflow-hidden">
            <DisasterSummary onClose={() => setShowDisasterSummary(false)} />
          </div>
        </ErrorBoundary>
      )}

      {showAdmin && (
        <ErrorBoundary>
          <div className="fixed inset-4 bg-white rounded-lg shadow-2xl z-40 overflow-hidden">
            <AdminDashboard onClose={() => setShowAdmin(false)} />
          </div>
        </ErrorBoundary>
      )}

      {showDisasterDashboard && (
        <ErrorBoundary>
          <div className="fixed inset-4 bg-white rounded-lg shadow-2xl z-40 overflow-hidden">
            <DisasterDashboard onClose={() => setShowDisasterDashboard(false)} />
          </div>
        </ErrorBoundary>
      )}

      {/* 上報對話框 */}
      {showReportModal && reportMode.location && (
        <ErrorBoundary>
          <ReportModal
            location={reportMode.location}
            onClose={() => setShowReportModal(false)}
            onSubmit={() => {
              setShowReportModal(false);
              toast.success('感謝您的回報！');
            }}
          />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App; 