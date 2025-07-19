import React, { useState, useEffect } from 'react';
import { FiFilter, FiSearch, FiAlertTriangle, FiMapPin, FiClock, FiTrendingUp, FiX, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

interface DisasterSummaryProps {
  onClose: () => void;
}

interface AlertData {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  description: string;
  timestamp: string;
  source: string;
  status: string;
  aiAnalysisId?: string;
}

interface AIAnalysisData {
  id: string;
  timestamp: string;
  overallRiskLevel: string;
  riskScore: number;
  summary: string;
  recommendations: string[];
  dataSource: {
    location: { lat: number; lng: number };
    confidence: number;
    riskFactors: string[];
  };
}

export function DisasterSummary({ onClose }: DisasterSummaryProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [analyses, setAnalyses] = useState<AIAnalysisData[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // 篩選狀態
  const [filters, setFilters] = useState({
    type: 'all', // all, flooding, earthquake, typhoon, landslide, fire
    severity: 'all', // all, low, medium, high, critical
    source: 'all', // all, real, mock
    timeRange: '24h' // 1h, 6h, 24h, 7d
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // 災害類型選項
  const disasterTypes = [
    { value: 'all', label: '全部類型', icon: '🔍' },
    { value: 'flooding', label: '淹水', icon: '🌊' },
    { value: 'earthquake', label: '地震', icon: '🏔️' },
    { value: 'typhoon', label: '颱風', icon: '🌪️' },
    { value: 'landslide', label: '土石流', icon: '⛰️' },
    { value: 'fire', label: '火災', icon: '🔥' }
  ];

  const severityLevels = [
    { value: 'all', label: '全部等級', color: 'gray' },
    { value: 'low', label: '低風險', color: 'green' },
    { value: 'medium', label: '中等風險', color: 'yellow' },
    { value: 'high', label: '高風險', color: 'orange' },
    { value: 'critical', label: '極高風險', color: 'red' }
  ];

  const timeRanges = [
    { value: '1h', label: '過去1小時' },
    { value: '6h', label: '過去6小時' },
    { value: '24h', label: '過去24小時' },
    { value: '7d', label: '過去7天' }
  ];

  // 載入數據
  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔍 載入災害資訊和AI分析...');
      const response = await api.get('/alerts/recent');
      const data = response.data;

      if (data.success && data.data) {
        setAlerts(data.data.recentAlerts || []);
        setAnalyses(data.data.recentAssessments || []);
        
        const summary = data.data.summary || {};
        if (summary.isRealData) {
          toast.success(`🤖 更新成功: ${data.data.recentAlerts?.length || 0} 筆災害警報`);
        } else {
          toast(`⚠️ 系統啟動中: 顯示模擬數據`, { icon: '⚠️', duration: 3000 });
        }
      }
    } catch (error) {
      console.error('❌ 載入災害資訊失敗:', error);
      toast.error('載入失敗，請檢查網路連接');
    } finally {
      setLoading(false);
    }
  };

  // 自動刷新
  useEffect(() => {
    fetchData();
    
    let intervalId: number | null = null;
    if (autoRefresh) {
      intervalId = window.setInterval(fetchData, 15000); // 15秒
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh]);

  // 篩選數據
  const filteredAlerts = alerts.filter(alert => {
    // 類型篩選
    if (filters.type !== 'all' && alert.type !== filters.type) return false;
    
    // 嚴重程度篩選
    if (filters.severity !== 'all' && alert.severity !== filters.severity) return false;
    
    // 數據源篩選
    if (filters.source !== 'all') {
      const isReal = !alert.source.includes('mock') && !alert.source.includes('system');
      if (filters.source === 'real' && !isReal) return false;
      if (filters.source === 'mock' && isReal) return false;
    }
    
    // 時間範圍篩選
    const alertTime = new Date(alert.timestamp).getTime();
    const now = Date.now();
    const timeLimits = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    const timeLimit = timeLimits[filters.timeRange as keyof typeof timeLimits];
    
    if (timeLimit && now - alertTime > timeLimit) return false;
    
    // 搜尋詞篩選
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        alert.description.toLowerCase().includes(searchLower) ||
        (alert.location.address && alert.location.address.toLowerCase().includes(searchLower)) ||
        alert.type.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // 獲取災害類型的中文名稱和圖標
  const getDisasterInfo = (type: string) => {
    const info = disasterTypes.find(t => t.value === type) || { label: type, icon: '❓' };
    return info;
  };

  // 獲取嚴重程度的顏色
  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-green-600 bg-green-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-orange-600 bg-orange-100',
      critical: 'text-red-600 bg-red-100'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins}分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小時前`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}天前`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg h-full flex flex-col">
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiAlertTriangle className="text-orange-600" />
            近期災害資訊
          </h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {filteredAlerts.length} / {alerts.length} 筆
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 自動刷新開關 */}
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600">自動更新</span>
          </label>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="手動刷新"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="篩選選項"
          >
            <FiFilter className="w-4 h-4" />
          </button>
          
          <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 篩選面板 */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b space-y-4">
          {/* 搜尋框 */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜尋災害描述、地點..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 災害類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">災害類型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {disasterTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 嚴重程度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">風險等級</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({...filters, severity: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 數據源 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">數據來源</label>
              <select
                value={filters.source}
                onChange={(e) => setFilters({...filters, source: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部來源</option>
                <option value="real">🤖 AI爬取</option>
                <option value="mock">📝 模擬數據</option>
              </select>
            </div>
            
            {/* 時間範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">時間範圍</label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({...filters, timeRange: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 災害列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-gray-600">載入災害資訊中...</p>
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FiAlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">沒有符合條件的災害資訊</p>
              <p className="text-sm text-gray-500">
                {alerts.length === 0 ? '系統正在爬取資料中...' : '請調整篩選條件'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => {
              const disasterInfo = getDisasterInfo(alert.type);
              const matchingAnalysis = analyses.find(a => a.id === alert.aiAnalysisId);
              
              return (
                <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* 警報標題 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{disasterInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          {disasterInfo.label}
                          <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                            {severityLevels.find(s => s.value === alert.severity)?.label || alert.severity}
                          </span>
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <FiMapPin className="w-3 h-3" />
                            {alert.location.address || `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        來源: {alert.source.includes('mock') ? '模擬' : 'AI爬取'}
                      </div>
                      {matchingAnalysis && (
                        <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                          <FiTrendingUp className="w-3 h-3" />
                          AI分析: {matchingAnalysis.riskScore}/5
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 警報描述 */}
                  <p className="text-gray-700 mb-3">{alert.description}</p>
                  
                  {/* AI分析結果 */}
                  {matchingAnalysis && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                        🧠 AI分析結果
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded">
                          {matchingAnalysis.overallRiskLevel}
                        </span>
                      </h4>
                      <p className="text-sm text-blue-700 mb-2">{matchingAnalysis.summary}</p>
                      
                      {matchingAnalysis.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-blue-800 mb-1">建議措施:</p>
                          <ul className="text-xs text-blue-600 space-y-1">
                            {matchingAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-blue-400">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-blue-600">
                        <span>信心度: {Math.round(matchingAnalysis.dataSource.confidence * 100)}%</span>
                        <span>風險因子: {matchingAnalysis.dataSource.riskFactors.length}個</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 