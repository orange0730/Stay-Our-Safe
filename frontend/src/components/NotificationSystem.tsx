import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { SeverityLevel } from '../types';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export function NotificationSystem() {
  const userLocation = useAppStore((state) => state.userLocation);
  const riskAssessment = useAppStore((state) => state.riskAssessment);
  const appSettings = useAppStore((state) => state.appSettings);
  const lastNotificationRef = useRef<{ areaId: string; timestamp: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 如果未啟用通知或無相關資料，直接返回
    if (!appSettings.notificationEnabled || !userLocation || !riskAssessment) {
      return;
    }

    // 檢查使用者是否在高風險區域內
    const dangerousAreas = riskAssessment.affectedAreas.filter(
      (area) => area.riskLevel >= SeverityLevel.HIGH
    );

    for (const area of dangerousAreas) {
      if (isLocationInArea(userLocation, area)) {
        // 檢查是否已經對這個區域發出過警告（避免重複）
        const now = Date.now();
        if (
          lastNotificationRef.current?.areaId === area.id &&
          now - lastNotificationRef.current.timestamp < 300000 // 5 分鐘內不重複
        ) {
          continue;
        }

        // 發出警告
        showDangerNotification(area);
        lastNotificationRef.current = { areaId: area.id, timestamp: now };

        // 播放警示音
        if (appSettings.voiceAlertEnabled) {
          playAlertSound();
        }

        break; // 只警告一個區域
      }
    }
  }, [userLocation, riskAssessment, appSettings]);

  // 檢查位置是否在區域內（簡化版本）
  const isLocationInArea = (location: { lat: number; lng: number }, area: any): boolean => {
    // 使用簡單的距離檢查代替複雜的多邊形檢查
    const distance = calculateDistance(
      location.lat,
      location.lng,
      area.center.lat,
      area.center.lng
    );

    // 根據區域的平均半徑判斷
    const radius = calculateAreaRadius(area);
    return distance <= radius;
  };

  // 計算兩點間距離
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 計算區域半徑
  const calculateAreaRadius = (area: any): number => {
    if (!area.polygon || area.polygon.length < 2) return 500;

    let maxDistance = 0;
    for (const point of area.polygon) {
      const distance = calculateDistance(
        area.center.lat,
        area.center.lng,
        point.lat,
        point.lng
      );
      maxDistance = Math.max(maxDistance, distance);
    }

    return maxDistance;
  };

  // 顯示危險通知
  const showDangerNotification = (area: any) => {
    const riskLevel = area.riskLevel;
    const riskText = riskLevel === SeverityLevel.CRITICAL ? '極高風險' : '高風險';
    const hazardTypes = [...new Set(area.hazards.map((h: any) => h.type))].join('、');

    // 使用自訂 toast 樣式
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-fade-in' : 'animate-fade-out'
          } max-w-md w-full bg-red-600 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-10 w-10 text-white animate-pulse" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-lg font-bold text-white">⚠️ {riskText}區域警告</p>
                <p className="mt-1 text-sm text-red-100">
                  您已進入{riskText}區域，此區域有{hazardTypes}災害風險，請立即採取防護措施！
                </p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      // 開啟路線規劃
                      useAppStore.getState().setIsPlanning(true);
                    }}
                    className="bg-white text-red-600 px-3 py-1 rounded text-sm font-medium hover:bg-red-50"
                  >
                    規劃逃生路線
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-red-700 text-white px-3 py-1 rounded text-sm font-medium hover:bg-red-800"
                  >
                    我知道了
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-red-700 rounded-md inline-flex text-red-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        duration: 10000, // 顯示 10 秒
        position: 'top-center',
      }
    );

    // 同時顯示瀏覽器原生通知（如果有權限）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ 災害警告', {
        body: `您已進入${riskText}區域，請注意安全！`,
        icon: '/icon-192x192.png',
        requireInteraction: true,
      });
    }
  };

  // 播放警示音
  const playAlertSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alert-sound.mp3');
      audioRef.current.volume = 0.7;
    }

    audioRef.current.play().catch((error) => {
      console.error('無法播放警示音:', error);
    });
  };

  // 請求通知權限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // 這個元件不渲染任何視覺內容
} 