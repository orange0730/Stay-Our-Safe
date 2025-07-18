// Mock 路線資料
export const mockRouteData = {
  routes: {
    safe: {
      type: "LineString" as const,
      coordinates: [
        [121.5354, 25.0180], // 起點
        [121.5420, 25.0200],
        [121.5480, 25.0250],
        [121.5550, 25.0300],
        [121.5620, 25.0350],
        [121.5654, 25.0380], // 終點附近
      ]
    },
    fast: {
      type: "LineString" as const,
      coordinates: [
        [121.5354, 25.0180], // 起點
        [121.5450, 25.0220], // 較直接的路線
        [121.5550, 25.0320],
        [121.5654, 25.0380], // 終點附近
      ]
    }
  },
  riskLevel: 2,
  description: "目前區域風險中等，建議使用安全路線避開積水區域"
}; 