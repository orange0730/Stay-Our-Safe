import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiDatabase, FiActivity, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import api, { hazardApi } from '../services/api';
import toast from 'react-hot-toast';

interface AdminDashboardProps {
  onClose: () => void;
}

interface AIAnalysis {
  id: string;
  timestamp: string;
  overallRiskLevel: string;
  riskScore: number;
  summary: string;
  recommendations: string[];
  dataSource: any;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'raw' | 'ai' | 'stats'>('raw');
  const [rawData, setRawData] = useState<any[]>([]);
  const [aiAnalysis, setAIAnalysis] = useState<AIAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [crawlStatus, setCrawlStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // 每15秒自動刷新數據（配合10秒爬取週期）
  useEffect(() => {
    fetchData();
    
    let intervalId: number | null = null;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        fetchData();
      }, 15000); // 15秒
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔍 AdminDashboard 開始獲取 alerts 數據...');
      
      // 使用統一的 API 客戶端
      const response = await api.get('/alerts/recent');
      const data = response.data;
      
      console.log('📊 AdminDashboard 收到響應:', data);
      
      if (data.success && data.data) {
        const alerts = data.data.recentAlerts || [];
        const assessments = data.data.recentAssessments || [];
        
        setRawData(alerts);
        setAIAnalysis(assessments);
        
        // 更新爬取狀態和時間戳
        const summary = data.data.summary || {};
        setCrawlStatus(summary.crawlStatus);
        setLastUpdate(new Date().toISOString());
        
        console.log('✅ AdminDashboard 數據設置完成:', {
          alertCount: alerts.length,
          assessmentCount: assessments.length,
          summary: summary,
          isRealData: summary.isRealData,
          crawlStatus: summary.crawlStatus
        });
        
        // 根據數據類型顯示不同的提示
        if (summary.isRealData) {
          toast.success(`🤖 實時數據: ${alerts.length} 筆警報, ${assessments.length} 筆 AI 分析`);
        } else {
          toast(`⚠️ 系統啟動中: 顯示模擬數據 (${alerts.length} 筆警報)`, {
            icon: '⚠️',
            duration: 4000
          });
        }
      } else {
        throw new Error('數據格式錯誤或無數據');
      }
    } catch (error) {
      console.error('❌ AdminDashboard 數據獲取失敗:', error);
      
      // 使用模擬數據作為後備
      const mockAlerts = [
        {
          id: `mock_alert_${Date.now()}`,
          type: 'flood',
          severity: 'medium',
          location: { lat: 25.0330, lng: 121.5654 },
          description: '台北車站附近積水警報 (模擬數據)',
          timestamp: new Date().toISOString(),
          source: 'mock',
          status: 'active'
        },
        {
          id: `mock_alert_${Date.now() + 1}`,
          type: 'roadblock',
          severity: 'high',
          location: { lat: 25.0478, lng: 121.5173 },
          description: '西門町道路封閉 (模擬數據)',
          timestamp: new Date().toISOString(),
          source: 'mock',
          status: 'active'
        }
      ];
      
      const mockAssessments: AIAnalysis[] = [
        {
          id: `mock_assessment_${Date.now()}`,
          timestamp: new Date().toISOString(),
          overallRiskLevel: '中等風險',
          riskScore: 2.5,
          summary: '根據當前氣象資料和交通狀況，此區域存在中等程度的積水風險。建議民眾避開低窪路段，選擇替代路線。',
          recommendations: ['避開低窪地區', '選擇替代路線', '使用大眾運輸'],
          dataSource: {
            location: { lat: 25.0330, lng: 121.5654 },
            confidence: 0.85,
            riskFactors: ['flooding', 'traffic']
          }
        },
        {
          id: `mock_assessment_${Date.now() + 1}`,
          timestamp: new Date().toISOString(),
          overallRiskLevel: '高風險',
          riskScore: 3.2,
          summary: 'AI 分析顯示此區域因施工造成交通壅塞，建議提前規劃替代路線並預留額外時間。',
          recommendations: ['提前規劃路線', '預留額外通行時間', '考慮大眾運輸'],
          dataSource: {
            location: { lat: 25.0478, lng: 121.5173 },
            confidence: 0.92,
            riskFactors: ['construction', 'traffic']
          }
        }
      ];
      
      setRawData(mockAlerts);
      setAIAnalysis(mockAssessments);
      
      toast.error('無法連接後端，使用模擬數據展示');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      // 使用新的 API 來觸發資料抓取和 AI 分析
      const result = await hazardApi.refreshWithAI();
      toast.success(result.message);
      
      // 等待一段時間後重新載入資料，給 AI 分析一些時間
      setTimeout(async () => {
        await fetchData();
        toast.success('AI 分析完成，資料已更新');
      }, 5000);
    } catch (error) {
      toast.error('更新資料失敗');
    }
  };

  const renderRawDataTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">原始 API 資料</h3>
          
          {/* 自動爬取狀態指示器 */}
          {crawlStatus && (
            <div className="flex items-center gap-2 text-sm bg-gray-100 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${crawlStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-gray-700">
                {crawlStatus.isRunning ? '🤖 自動爬取中' : '⏸️ 爬取已停止'}
              </span>
              {crawlStatus.totalAnalyses > 0 && (
                <span className="text-gray-500">({crawlStatus.totalAnalyses}筆)</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* 自動刷新開關 */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600">自動刷新 (15s)</span>
          </label>
          
          {/* 最後更新時間 */}
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              更新: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={loading}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? '載入中...' : '手動刷新'}
          </button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {rawData.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100"
            onClick={() => setSelectedItem(item)}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{item.source}</p>
                <p className="text-sm text-gray-600">
                  {new Date(item.timestamp).toLocaleString('zh-TW')}
                </p>
                {item.location && (
                  <p className="text-sm text-gray-600">
                    位置: {item.location.name || `${item.location.lat}, ${item.location.lng}`}
                  </p>
                )}
              </div>
              <div className="text-right">
                {item.alertLevel && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.alertLevel === 'critical' ? 'bg-red-100 text-red-800' :
                    item.alertLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                    item.alertLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {item.alertLevel}
                  </span>
                )}
              </div>
            </div>
            {item.parameter && (
              <p className="mt-2 text-sm">
                {item.parameter}: {item.value} {item.unit}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAIAnalysisTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI 風險分析結果</h3>
      
      <div className="grid gap-4">
        {aiAnalysis.map((analysis) => (
          <div
            key={analysis.id}
            className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100"
            onClick={() => setSelectedItem(analysis)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">風險評估報告</p>
                <p className="text-sm text-gray-600">
                  {new Date(analysis.timestamp).toLocaleString('zh-TW')}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  analysis.overallRiskLevel === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  analysis.overallRiskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  analysis.overallRiskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {analysis.overallRiskLevel}
                </span>
                <p className="mt-1 text-sm font-medium">
                  風險分數: {analysis.riskScore}/100
                </p>
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">AI 分析摘要：</p>
              <p className="text-sm text-gray-700">{analysis.summary}</p>
            </div>
            
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">建議措施：</p>
                <ul className="list-disc list-inside text-sm text-gray-700">
                  {analysis.recommendations.slice(0, 2).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStatsTab = () => {
    const stats = {
      totalRawData: rawData.length,
      totalAIAnalysis: aiAnalysis.length,
      criticalAlerts: rawData.filter(d => d.alertLevel === 'critical').length,
      highAlerts: rawData.filter(d => d.alertLevel === 'high').length,
      sources: [...new Set(rawData.map(d => d.source))]
    };

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">統計資訊</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FiDatabase className="text-2xl text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">原始資料筆數</p>
                <p className="text-2xl font-bold">{stats.totalRawData}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FiActivity className="text-2xl text-green-500" />
              <div>
                <p className="text-sm text-gray-600">AI 分析報告</p>
                <p className="text-2xl font-bold">{stats.totalAIAnalysis}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="text-2xl text-red-500" />
              <div>
                <p className="text-sm text-gray-600">嚴重警報</p>
                <p className="text-2xl font-bold">{stats.criticalAlerts}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FiAlertTriangle className="text-2xl text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">高度警報</p>
                <p className="text-2xl font-bold">{stats.highAlerts}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">資料來源：</p>
          <div className="flex flex-wrap gap-2">
            {stats.sources.map(source => (
              <span key={source} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {source}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">後台管理介面</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'raw'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            原始資料
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'ai'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            AI 分析
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'stats'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            統計資訊
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex">
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <FiRefreshCw className="animate-spin text-4xl text-gray-400" />
              </div>
            ) : (
              <>
                {activeTab === 'raw' && renderRawDataTab()}
                {activeTab === 'ai' && renderAIAnalysisTab()}
                {activeTab === 'stats' && renderStatsTab()}
              </>
            )}
          </div>
          
          {/* Detail Panel */}
          {selectedItem && (
            <div className="w-1/3 border-l p-6 overflow-y-auto bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">詳細資料</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  ✕
                </button>
              </div>
              <pre className="text-xs bg-white p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(selectedItem, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 