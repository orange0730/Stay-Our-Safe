import { create } from 'zustand';
import { Coordinates, HazardData, UserReport, RiskAssessment, MapViewState, AppSettings } from '../types';

interface AppState {
  // 使用者位置
  userLocation: Coordinates | null;
  setUserLocation: (location: Coordinates | null) => void;

  // 災害資料
  hazards: HazardData[];
  setHazards: (hazards: HazardData[]) => void;

  // 使用者上報
  userReports: UserReport[];
  setUserReports: (reports: UserReport[]) => void;

  // 風險評估
  riskAssessment: RiskAssessment | null;
  setRiskAssessment: (assessment: RiskAssessment | null) => void;

  // 地圖視圖狀態
  mapViewState: MapViewState;
  setMapViewState: (state: Partial<MapViewState>) => void;

  // 選中的災害或上報
  selectedHazardId: string | null;
  setSelectedHazardId: (id: string | null) => void;

  // 應用程式設定
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => void;

  // 載入狀態
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // 路線規劃狀態
  routePlanning: {
    start: Coordinates | null;
    end: Coordinates | null;
    isPlanning: boolean;
    avoidHazardTypes: string[]; // 要避開的災害類型
    navigationMode: 'safest' | 'fastest' | 'balanced'; // 導航模式
  };
  setRouteStart: (location: Coordinates | null) => void;
  setRouteEnd: (location: Coordinates | null) => void;
  setIsPlanning: (planning: boolean) => void;
  setAvoidHazardTypes: (types: string[]) => void;
  setNavigationMode: (mode: 'safest' | 'fastest' | 'balanced') => void;

  // 路線數據狀態
  routes: {
    safest: Coordinates[] | null;
    fastest: Coordinates[] | null;
    balanced: Coordinates[] | null;
  };
  setRoutes: (routes: { safest?: Coordinates[] | null; fastest?: Coordinates[] | null; balanced?: Coordinates[] | null; }) => void;

  // 導航狀態
  navigation: {
    isActive: boolean;
    currentRoute: Coordinates[] | null;
    currentPosition: number;
    instructions: string[];
  };
  startNavigation: (route: Coordinates[], instructions: string[]) => void;
  updateNavigationPosition: (position: number) => void;
  stopNavigation: () => void;

  // 上報模式
  reportMode: {
    isActive: boolean;
    location: Coordinates | null;
  };
  setReportMode: (active: boolean, location?: Coordinates | null) => void;

  // 重置狀態
  reset: () => void;
}

// 預設應用程式設定
const defaultAppSettings: AppSettings = {
  notificationEnabled: true,
  voiceAlertEnabled: true,
  autoRefreshInterval: 300, // 5 分鐘
  dangerZoneRadius: 1000, // 1 公里
  language: 'zh-TW',
};

// 預設地圖視圖狀態
const defaultMapViewState: MapViewState = {
  center: { lat: 25.0330, lng: 121.5654 }, // 台北市
  zoom: 12,
  showHeatmap: true,
  showRoutes: true,
  selectedHazards: [],
};

export const useAppStore = create<AppState>((set) => ({
  // 使用者位置
  userLocation: null,
  setUserLocation: (location) => set({ userLocation: location }),

  // 災害資料
  hazards: [],
  setHazards: (hazards) => set({ hazards }),

  // 使用者上報
  userReports: [],
  setUserReports: (reports) => set({ userReports: reports }),

  // 風險評估
  riskAssessment: null,
  setRiskAssessment: (assessment) => set({ riskAssessment: assessment }),

  // 地圖視圖狀態
  mapViewState: defaultMapViewState,
  setMapViewState: (state) =>
    set((prev) => ({
      mapViewState: { ...prev.mapViewState, ...state },
    })),

  // 選中的災害或上報
  selectedHazardId: null,
  setSelectedHazardId: (id) => set({ selectedHazardId: id }),

  // 應用程式設定
  appSettings: defaultAppSettings,
  updateAppSettings: (settings) =>
    set((prev) => ({
      appSettings: { ...prev.appSettings, ...settings },
    })),

  // 載入狀態
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // 路線規劃狀態
  routePlanning: {
    start: null,
    end: null,
    isPlanning: false,
    avoidHazardTypes: [],
    navigationMode: 'safest',
  },
  setRouteStart: (location) =>
    set((prev) => ({
      routePlanning: { ...prev.routePlanning, start: location },
    })),
  setRouteEnd: (location) =>
    set((prev) => ({
      routePlanning: { ...prev.routePlanning, end: location },
    })),
  setIsPlanning: (planning) =>
    set((prev) => ({
      routePlanning: { ...prev.routePlanning, isPlanning: planning },
    })),
  setAvoidHazardTypes: (types) =>
    set((prev) => ({
      routePlanning: { ...prev.routePlanning, avoidHazardTypes: types },
    })),
  setNavigationMode: (mode) =>
    set((prev) => ({
      routePlanning: { ...prev.routePlanning, navigationMode: mode },
    })),

  // 路線數據狀態
  routes: {
    safest: null,
    fastest: null,
    balanced: null,
  },
  setRoutes: (routes) => set((prev) => ({ 
    routes: { ...prev.routes, ...routes } 
  })),

  // 導航狀態
  navigation: {
    isActive: false,
    currentRoute: null,
    currentPosition: 0,
    instructions: [],
  },
  startNavigation: (route, instructions) =>
    set({
      navigation: {
        isActive: true,
        currentRoute: route,
        currentPosition: 0,
        instructions: instructions,
      },
    }),
  updateNavigationPosition: (position) =>
    set((prev) => ({
      navigation: { ...prev.navigation, currentPosition: position },
    })),
  stopNavigation: () =>
    set({
      navigation: {
        isActive: false,
        currentRoute: null,
        currentPosition: 0,
        instructions: [],
      },
    }),

  // 上報模式
  reportMode: {
    isActive: false,
    location: null,
  },
  setReportMode: (active, location) =>
    set({
      reportMode: {
        isActive: active,
        location: location || null,
      },
    }),

  // 重置狀態
  reset: () =>
    set({
      userLocation: null,
      hazards: [],
      userReports: [],
      riskAssessment: null,
      mapViewState: defaultMapViewState,
      selectedHazardId: null,
      appSettings: defaultAppSettings,
      isLoading: false,
      routePlanning: {
        start: null,
        end: null,
        isPlanning: false,
        avoidHazardTypes: [],
        navigationMode: 'safest',
      },
      navigation: {
        isActive: false,
        currentRoute: null,
        currentPosition: 0,
        instructions: [],
      },
      reportMode: {
        isActive: false,
        location: null,
      },
    }),
})); 