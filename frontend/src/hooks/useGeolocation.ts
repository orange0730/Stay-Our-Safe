import { useEffect } from 'react';
import { useAppStore } from './useAppStore';
import toast from 'react-hot-toast';

export function useGeolocation() {
  const setUserLocation = useAppStore((state) => state.setUserLocation);
  const userLocation = useAppStore((state) => state.userLocation);
  const appSettings = useAppStore((state) => state.appSettings);

  useEffect(() => {
    // 檢查瀏覽器是否支援地理位置
    if (!navigator.geolocation) {
      toast.error('您的瀏覽器不支援地理位置功能');
      return;
    }

    let watchId: number;

    const handleSuccess = (position: GeolocationPosition) => {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      // 只在位置有明顯變化時更新（避免過度更新）
      if (!userLocation ||
          Math.abs(userLocation.lat - newLocation.lat) > 0.0001 ||
          Math.abs(userLocation.lng - newLocation.lng) > 0.0001) {
        setUserLocation(newLocation);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('地理位置錯誤:', error);
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          toast.error('請允許存取您的位置以使用完整功能');
          break;
        case error.POSITION_UNAVAILABLE:
          toast.error('無法取得您的位置資訊');
          break;
        case error.TIMEOUT:
          toast.error('取得位置資訊逾時');
          break;
      }
    };

    // 先取得一次位置
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // 持續追蹤位置
    if (appSettings.notificationEnabled) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
    }

    // 清理函數
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [setUserLocation, userLocation, appSettings.notificationEnabled]);
} 