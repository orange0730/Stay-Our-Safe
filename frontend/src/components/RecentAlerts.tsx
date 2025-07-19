import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiAlertCircle, FiActivity, FiX } from 'react-icons/fi';

interface RecentAlertsProps {
  onClose: () => void;
}

interface AlertData {
    id: string;
    source: string;
    timestamp: string;
    location: {
        name: string;
        lat: number;
        lng: number;
    };
    parameter: string;
    value: number;
    unit: string;
    alert: string;
    alertLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface RiskAssessment {
    id: string;
    timestamp: string;
    overallRiskLevel: string;
    riskScore: number;
    summary: string;
    affectedAreas: any[];
    recommendations: string[];
}

export function RecentAlerts({ onClose }: RecentAlertsProps) {
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 使用新的後端 API
    const API_BASE_URL = import.meta.env.PROD 
        ? 'https://stay-our-safe-backend-gcgagbbhgdawd0da.canadacentral-01.azurewebsites.net/api' 
        : '/api';

    useEffect(() => {
        fetchRecentAlerts();
        // 每分鐘更新一次
        const interval = setInterval(fetchRecentAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchRecentAlerts = async () => {
        try {
            // 使用新的後端 API
            const response = await fetch(`${API_BASE_URL}/alerts/recent`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch alerts');
            }

            const data = await response.json();
            setAlerts(data.recentAlerts || []);
            setAssessments(data.recentAssessments || []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const getAlertIcon = (level: string) => {
        switch (level) {
            case 'critical':
                return <FiAlertTriangle className="w-5 h-5 text-red-600" />;
            case 'high':
                return <FiAlertCircle className="w-5 h-5 text-orange-600" />;
            default:
                return <FiActivity className="w-5 h-5 text-yellow-600" />;
        }
    };

    const getAlertColor = (level: string) => {
        switch (level) {
            case 'critical':
                return 'border-l-4 border-red-600 bg-red-50';
            case 'high':
                return 'border-l-4 border-orange-600 bg-orange-50';
            default:
                return 'border-l-4 border-yellow-600 bg-yellow-50';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('zh-TW');
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="text-center text-gray-500">載入中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="bg-red-50 border-l-4 border-red-600 p-4">
                    <div className="flex items-center">
                        <FiAlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 標題列 */}
            <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FiActivity className="text-blue-600" />
                    最新警報
                </h2>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="關閉"
                >
                    <FiX className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* 最新風險評估 */}
            {assessments.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b">
                        <h3 className="font-semibold text-gray-800">最新風險評估</h3>
                    </div>
                    <div className="p-4">
                        {assessments.slice(0, 1).map((assessment) => (
                            <div key={assessment.id} className="space-y-4">
                                <div className={`p-4 rounded-lg ${getAlertColor(assessment.overallRiskLevel)}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        {getAlertIcon(assessment.overallRiskLevel)}
                                        <span className="font-semibold">
                                            風險等級：{assessment.overallRiskLevel} ({assessment.riskScore}/100)
                                        </span>
                                    </div>
                                    <p className="text-sm mb-2">{assessment.summary}</p>
                                    <div className="text-xs text-gray-600">
                                        {formatTimestamp(assessment.timestamp)}
                                    </div>
                                </div>
                                
                                {assessment.recommendations.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">建議事項：</h4>
                                        <ul className="list-disc list-inside space-y-1">
                                            {assessment.recommendations.map((rec, idx) => (
                                                <li key={idx} className="text-sm">{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 近期災害警報 */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-800">近期災害警報</h3>
                </div>
                <div className="p-4">
                    {alerts.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">
                            目前沒有警報
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className={`p-4 rounded-lg ${getAlertColor(alert.alertLevel)}`}
                                >
                                    <div className="flex items-start gap-3">
                                        {getAlertIcon(alert.alertLevel)}
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold">
                                                {alert.location.name} - {alert.parameter}
                                            </div>
                                            <p className="text-sm mt-1">{alert.alert}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-gray-600">
                                                    數值：{alert.value} {alert.unit}
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    {formatTimestamp(alert.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 