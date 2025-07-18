import { HazardData, HazardType, SeverityLevel } from '../types';

export const mockHazardData: HazardData[] = [
  {
    id: '1',
    type: HazardType.FLOOD,
    severity: SeverityLevel.CRITICAL,
    location: { lat: 25.0330, lng: 121.5654 },
    description: '信義區基隆路積水嚴重，水深約50公分',
    source: 'government',
    reportedAt: new Date().toISOString(),
    verifiedCount: 15,
    affectedRadius: 500
  },
  {
    id: '2',
    type: HazardType.FIRE,
    severity: SeverityLevel.HIGH,
    location: { lat: 25.0478, lng: 121.5170 },
    description: '萬華區民宅火災，已派遣消防車前往',
    source: 'community',
    reportedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    verifiedCount: 8,
    affectedRadius: 200
  },
  {
    id: '3',
    type: HazardType.LANDSLIDE,
    severity: SeverityLevel.HIGH,
    location: { lat: 25.0940, lng: 121.5520 },
    description: '北投區陽明山路段土石流警戒',
    source: 'government',
    reportedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    verifiedCount: 12,
    affectedRadius: 1000
  },
  {
    id: '4',
    type: HazardType.ROADBLOCK,
    severity: SeverityLevel.MEDIUM,
    location: { lat: 25.0410, lng: 121.5430 },
    description: '忠孝東路車禍，東向車道封閉',
    source: 'community',
    reportedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    verifiedCount: 5,
    affectedRadius: 300
  },
  {
    id: '5',
    type: HazardType.COLLAPSE,
    severity: SeverityLevel.CRITICAL,
    location: { lat: 25.0260, lng: 121.5230 },
    description: '中正區老舊建築部分倒塌，請勿靠近',
    source: 'government',
    reportedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    verifiedCount: 20,
    affectedRadius: 100
  },
  {
    id: '6',
    type: HazardType.FLOOD,
    severity: SeverityLevel.MEDIUM,
    location: { lat: 25.0630, lng: 121.5200 },
    description: '中山區民生東路積水，請小心行駛',
    source: 'community',
    reportedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    verifiedCount: 3,
    affectedRadius: 400
  },
  {
    id: '7',
    type: HazardType.OTHER,
    severity: SeverityLevel.LOW,
    location: { lat: 25.0550, lng: 121.5450 },
    description: '松山區路樹倒塌，已派員處理',
    source: 'community',
    reportedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    verifiedCount: 2,
    affectedRadius: 50
  },
  {
    id: '8',
    type: HazardType.FIRE,
    severity: SeverityLevel.MEDIUM,
    location: { lat: 25.0380, lng: 121.5680 },
    description: '南港區工廠冒煙，消防隊已到場',
    source: 'government',
    reportedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    verifiedCount: 6,
    affectedRadius: 300
  },
  {
    id: '9',
    type: HazardType.FLOOD,
    severity: SeverityLevel.LOW,
    location: { lat: 25.0710, lng: 121.5520 },
    description: '內湖區路面輕微積水',
    source: 'community',
    reportedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    verifiedCount: 1,
    affectedRadius: 200
  },
  {
    id: '10',
    type: HazardType.ROADBLOCK,
    severity: SeverityLevel.HIGH,
    location: { lat: 25.0450, lng: 121.5350 },
    description: '市民大道高架橋車禍，嚴重回堵',
    source: 'government',
    reportedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    verifiedCount: 10,
    affectedRadius: 800
  }
]; 