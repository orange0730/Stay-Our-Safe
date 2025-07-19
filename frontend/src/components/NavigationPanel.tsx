import React, { useState, useEffect } from 'react';
import { FiNavigation, FiX, FiMapPin, FiClock, FiAlertTriangle, FiSettings, FiZap, FiShield, FiTarget, FiSearch } from 'react-icons/fi';
import { MdDirectionsCar, MdDirectionsWalk, MdDirectionsBike } from 'react-icons/md';
import { mapApi } from '../services/api';
import { RouteResult, RoutePlanningResult } from '../types';
import toast from 'react-hot-toast';

interface NavigationPanelProps {
  onClose: () => void;
}

interface LocationSuggestion {
  id: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: 'local' | 'azure' | 'search';
  category?: string;
}

export function NavigationPanel({ onClose }: NavigationPanelProps) {
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [travelMode, setTravelMode] = useState<'driving' | 'walking' | 'cycling'>('driving');
  const [routeType, setRouteType] = useState<'safest' | 'fastest' | 'balanced'>('safest');
  const [avoidHazards, setAvoidHazards] = useState<string[]>(['flood']);
  const [isLoading, setIsLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RoutePlanningResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 地址搜索相關狀態
  const [fromSuggestions, setFromSuggestions] = useState<LocationSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<LocationSuggestion[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  // 災害類型選項
const hazardTypes = [
    { id: 'flood', label: '淹水', icon: '🌊', color: 'text-blue-600' },
    { id: 'earthquake', label: '地震', icon: '🏔️', color: 'text-red-600' },
    { id: 'fire', label: '火災', icon: '🔥', color: 'text-orange-600' },
    { id: 'landslide', label: '土石流', icon: '⛰️', color: 'text-yellow-600' },
    { id: 'typhoon', label: '颱風', icon: '🌪️', color: 'text-gray-600' }
  ];

  // 旅行模式選項
  const travelModes = [
    { id: 'driving', label: '開車', icon: MdDirectionsCar, color: 'text-blue-600', speed: '50 km/h' },
    { id: 'walking', label: '步行', icon: MdDirectionsWalk, color: 'text-green-600', speed: '5 km/h' },
    { id: 'cycling', label: '騎車', icon: MdDirectionsBike, color: 'text-purple-600', speed: '15 km/h' }
  ];

  // 路線類型選項
  const routeTypes = [
    { 
      id: 'safest', 
      label: '最安全', 
      icon: FiShield, 
      color: 'text-green-600',
      description: '避開災害區域，優先安全'
    },
    { 
      id: 'fastest', 
      label: '最快速', 
      icon: FiZap, 
      color: 'text-orange-600',
      description: '最短時間到達'
    },
    { 
      id: 'balanced', 
      label: '平衡路線', 
      icon: FiTarget, 
      color: 'text-blue-600',
      description: '時間與安全平衡'
    }
  ];

  // 本地地點數據庫
  const localLocations: LocationSuggestion[] = [
    // === 台北市主要地點 ===
    // 地標建築
    { id: 'taipei-101', address: '台北101', coordinates: { lat: 25.0338, lng: 121.5645 }, type: 'local', category: '地標' },
    { id: 'presidential-office', address: '總統府', coordinates: { lat: 25.0404, lng: 121.5088 }, type: 'local', category: '地標' },
    { id: 'chiang-kai-shek', address: '中正紀念堂', coordinates: { lat: 25.0364, lng: 121.5216 }, type: 'local', category: '地標' },
    { id: 'sun-yat-sen', address: '國父紀念館', coordinates: { lat: 25.0408, lng: 121.5600 }, type: 'local', category: '地標' },
    { id: 'longshan-temple', address: '龍山寺', coordinates: { lat: 25.0368, lng: 121.4999 }, type: 'local', category: '地標' },

    // 交通樞紐
    { id: 'taipei-station', address: '台北車站', coordinates: { lat: 25.0478, lng: 121.5170 }, type: 'local', category: '交通' },
    { id: 'songshan-airport', address: '松山機場', coordinates: { lat: 25.0697, lng: 121.5516 }, type: 'local', category: '交通' },
    { id: 'taoyuan-airport', address: '桃園機場', coordinates: { lat: 25.0797, lng: 121.2342 }, type: 'local', category: '交通' },
    { id: 'nangang-station', address: '南港車站', coordinates: { lat: 25.0535, lng: 121.6064 }, type: 'local', category: '交通' },
    { id: 'bannan-station', address: '板南線忠孝復興站', coordinates: { lat: 25.0419, lng: 121.5440 }, type: 'local', category: '交通' },

    // 商圈購物
    { id: 'ximending', address: '西門町', coordinates: { lat: 25.0420, lng: 121.5067 }, type: 'local', category: '商圈' },
    { id: 'east-district', address: '東區', coordinates: { lat: 25.0419, lng: 121.5440 }, type: 'local', category: '商圈' },
    { id: 'xinyi-district', address: '信義商圈', coordinates: { lat: 25.0340, lng: 121.5645 }, type: 'local', category: '商圈' },
    { id: 'zhongshan-district', address: '中山商圈', coordinates: { lat: 25.0523, lng: 121.5201 }, type: 'local', category: '商圈' },
    { id: 'tianmu', address: '天母商圈', coordinates: { lat: 25.1176, lng: 121.5274 }, type: 'local', category: '商圈' },
    { id: 'gongguan', address: '公館商圈', coordinates: { lat: 25.0128, lng: 121.5347 }, type: 'local', category: '商圈' },

    // 夜市美食
    { id: 'shilin', address: '士林夜市', coordinates: { lat: 25.0880, lng: 121.5239 }, type: 'local', category: '夜市' },
    { id: 'raohe', address: '饒河夜市', coordinates: { lat: 25.0513, lng: 121.5776 }, type: 'local', category: '夜市' },
    { id: 'ningxia', address: '寧夏夜市', coordinates: { lat: 25.0559, lng: 121.5158 }, type: 'local', category: '夜市' },
    { id: 'huaxi', address: '華西街夜市', coordinates: { lat: 25.0378, lng: 121.4995 }, type: 'local', category: '夜市' },
    { id: 'tonghua', address: '通化夜市', coordinates: { lat: 25.0329, lng: 121.5534 }, type: 'local', category: '夜市' },

    // 行政區
    { id: 'xinyi', address: '信義區', coordinates: { lat: 25.0340, lng: 121.5645 }, type: 'local', category: '行政區' },
    { id: 'daan', address: '大安區', coordinates: { lat: 25.0263, lng: 121.5436 }, type: 'local', category: '行政區' },
    { id: 'zhongshan', address: '中山區', coordinates: { lat: 25.0714, lng: 121.5269 }, type: 'local', category: '行政區' },
    { id: 'songshan', address: '松山區', coordinates: { lat: 25.0500, lng: 121.5781 }, type: 'local', category: '行政區' },
    { id: 'zhongzheng', address: '中正區', coordinates: { lat: 25.0320, lng: 121.5108 }, type: 'local', category: '行政區' },
    { id: 'wanhua', address: '萬華區', coordinates: { lat: 25.0338, lng: 121.4951 }, type: 'local', category: '行政區' },
    { id: 'shilin-dist', address: '士林區', coordinates: { lat: 25.1037, lng: 121.5258 }, type: 'local', category: '行政區' },
    { id: 'beitou', address: '北投區', coordinates: { lat: 25.1372, lng: 121.5088 }, type: 'local', category: '行政區' },

    // === 新北市 ===
    // 觀光景點
    { id: 'tamsui', address: '淡水', coordinates: { lat: 25.1677, lng: 121.4406 }, type: 'local', category: '觀光' },
    { id: 'jiufen', address: '九份', coordinates: { lat: 25.1097, lng: 121.8442 }, type: 'local', category: '觀光' },
    { id: 'yehliu', address: '野柳', coordinates: { lat: 25.2056, lng: 121.6893 }, type: 'local', category: '觀光' },
    { id: 'pingxi', address: '平溪', coordinates: { lat: 25.0259, lng: 121.7394 }, type: 'local', category: '觀光' },
    { id: 'shifen', address: '十分', coordinates: { lat: 25.0414, lng: 121.7742 }, type: 'local', category: '觀光' },
    { id: 'wulai', address: '烏來', coordinates: { lat: 24.8452, lng: 121.5497 }, type: 'local', category: '觀光' },
    { id: 'danshui-old-street', address: '淡水老街', coordinates: { lat: 25.1677, lng: 121.4406 }, type: 'local', category: '觀光' },

    // 新北市區
    { id: 'banqiao', address: '板橋', coordinates: { lat: 25.0118, lng: 121.4627 }, type: 'local', category: '城市' },
    { id: 'zhonghe', address: '中和', coordinates: { lat: 24.9989, lng: 121.4992 }, type: 'local', category: '城市' },
    { id: 'sanchong', address: '三重', coordinates: { lat: 25.0615, lng: 121.4847 }, type: 'local', category: '城市' },
    { id: 'xinzhuang', address: '新莊', coordinates: { lat: 25.0378, lng: 121.4318 }, type: 'local', category: '城市' },
    { id: 'yonghe', address: '永和', coordinates: { lat: 25.0097, lng: 121.5156 }, type: 'local', category: '城市' },

    // === 其他縣市 ===
    // 主要城市
    { id: 'taichung', address: '台中', coordinates: { lat: 24.1477, lng: 120.6736 }, type: 'local', category: '城市' },
    { id: 'kaohsiung', address: '高雄', coordinates: { lat: 22.6273, lng: 120.3014 }, type: 'local', category: '城市' },
    { id: 'tainan', address: '台南', coordinates: { lat: 22.9999, lng: 120.2269 }, type: 'local', category: '城市' },
    { id: 'hsinchu', address: '新竹', coordinates: { lat: 24.8138, lng: 120.9675 }, type: 'local', category: '城市' },
    { id: 'keelung', address: '基隆', coordinates: { lat: 25.1276, lng: 121.7392 }, type: 'local', category: '城市' },
    { id: 'taoyuan', address: '桃園', coordinates: { lat: 24.9937, lng: 121.3009 }, type: 'local', category: '城市' },

    // 知名景點
    { id: 'sun-moon-lake', address: '日月潭', coordinates: { lat: 23.8690, lng: 120.9129 }, type: 'local', category: '觀光' },
    { id: 'alishan', address: '阿里山', coordinates: { lat: 23.5081, lng: 120.8056 }, type: 'local', category: '觀光' },
    { id: 'taroko', address: '太魯閣', coordinates: { lat: 24.1939, lng: 121.4906 }, type: 'local', category: '觀光' },
    { id: 'kenting', address: '墾丁', coordinates: { lat: 22.0017, lng: 120.7989 }, type: 'local', category: '觀光' },
    { id: 'hualien', address: '花蓮', coordinates: { lat: 23.9871, lng: 121.6015 }, type: 'local', category: '城市' },
    { id: 'taitung', address: '台東', coordinates: { lat: 22.7583, lng: 121.1444 }, type: 'local', category: '城市' },

    // === 大學院校 ===
    { id: 'ntu', address: '台灣大學', coordinates: { lat: 25.0173, lng: 121.5397 }, type: 'local', category: '大學' },
    { id: 'nccu', address: '政治大學', coordinates: { lat: 24.9886, lng: 121.5755 }, type: 'local', category: '大學' },
    { id: 'ntnu', address: '師範大學', coordinates: { lat: 25.0266, lng: 121.5276 }, type: 'local', category: '大學' },
    { id: 'ntu-tech', address: '台科大', coordinates: { lat: 25.0139, lng: 121.5403 }, type: 'local', category: '大學' },
    { id: 'nctu', address: '交通大學', coordinates: { lat: 24.7875, lng: 120.9968 }, type: 'local', category: '大學' },
    { id: 'nctu-taipei', address: '陽明交大', coordinates: { lat: 25.0149, lng: 121.4668 }, type: 'local', category: '大學' },
    { id: 'tku', address: '淡江大學', coordinates: { lat: 25.1765, lng: 121.4499 }, type: 'local', category: '大學' },
    { id: 'fju', address: '輔仁大學', coordinates: { lat: 25.0357, lng: 121.4339 }, type: 'local', category: '大學' },
    { id: 'scu', address: '東吳大學', coordinates: { lat: 25.0974, lng: 121.5359 }, type: 'local', category: '大學' },
    { id: 'shu', address: '世新大學', coordinates: { lat: 24.9738, lng: 121.5413 }, type: 'local', category: '大學' },

    // === 醫院 ===
    { id: 'ntuh', address: '台大醫院', coordinates: { lat: 25.0420, lng: 121.5194 }, type: 'local', category: '醫院' },
    { id: 'mackay', address: '馬偕醫院', coordinates: { lat: 25.0574, lng: 121.5174 }, type: 'local', category: '醫院' },
    { id: 'veterans', address: '榮總', coordinates: { lat: 25.1201, lng: 121.5239 }, type: 'local', category: '醫院' },
    { id: 'tri-service', address: '三總', coordinates: { lat: 25.0786, lng: 121.5888 }, type: 'local', category: '醫院' },
    { id: 'chang-gung', address: '長庚醫院', coordinates: { lat: 25.0576, lng: 121.3926 }, type: 'local', category: '醫院' },
    { id: 'cathay', address: '國泰醫院', coordinates: { lat: 25.0419, lng: 121.5532 }, type: 'local', category: '醫院' },
    { id: 'tzu-chi', address: '慈濟醫院', coordinates: { lat: 25.0356, lng: 121.5633 }, type: 'local', category: '醫院' },

    // === 百貨商場 ===
    { id: 'taipei-101-mall', address: '台北101購物中心', coordinates: { lat: 25.0338, lng: 121.5645 }, type: 'local', category: '購物' },
    { id: 'shin-kong-mitsukoshi', address: '新光三越', coordinates: { lat: 25.0419, lng: 121.5652 }, type: 'local', category: '購物' },
    { id: 'sogo', address: 'SOGO百貨', coordinates: { lat: 25.0419, lng: 121.5440 }, type: 'local', category: '購物' },
    { id: 'breeze', address: '微風廣場', coordinates: { lat: 25.0478, lng: 121.5170 }, type: 'local', category: '購物' },
    { id: 'neo19', address: 'Neo19', coordinates: { lat: 25.0415, lng: 121.5521 }, type: 'local', category: '購物' },
    { id: 'att4fun', address: 'ATT 4 FUN', coordinates: { lat: 25.0419, lng: 121.5652 }, type: 'local', category: '購物' },

    // === 文化景點 ===
    { id: 'palace-museum', address: '故宮博物院', coordinates: { lat: 25.1013, lng: 121.5486 }, type: 'local', category: '文化' },
    { id: 'fine-arts-museum', address: '美術館', coordinates: { lat: 25.0726, lng: 121.5251 }, type: 'local', category: '文化' },
    { id: 'museum-of-history', address: '歷史博物館', coordinates: { lat: 25.0311, lng: 121.5118 }, type: 'local', category: '文化' },
    { id: 'national-theater', address: '國家戲劇院', coordinates: { lat: 25.0364, lng: 121.5216 }, type: 'local', category: '文化' },
    { id: 'huashan', address: '華山文創園區', coordinates: { lat: 25.0433, lng: 121.5295 }, type: 'local', category: '文化' },
    { id: 'songshan-cultural', address: '松山文創園區', coordinates: { lat: 25.0433, lng: 121.5606 }, type: 'local', category: '文化' },

    // === 科技園區 ===
    { id: 'hsinchu-science-park', address: '新竹科學園區', coordinates: { lat: 24.7805, lng: 120.9969 }, type: 'local', category: '科技' },
    { id: 'nankang-software', address: '南港軟體園區', coordinates: { lat: 25.0594, lng: 121.6154 }, type: 'local', category: '科技' },
    { id: 'neihu-tech', address: '內湖科技園區', coordinates: { lat: 25.0811, lng: 121.5794 }, type: 'local', category: '科技' },

    // === 運動場館 ===
    { id: 'taipei-arena', address: '小巨蛋', coordinates: { lat: 25.0514, lng: 121.5503 }, type: 'local', category: '運動' },
    { id: 'tianmu-stadium', address: '天母棒球場', coordinates: { lat: 25.1174, lng: 121.5274 }, type: 'local', category: '運動' },
    { id: 'taipei-dome', address: '大巨蛋', coordinates: { lat: 25.0514, lng: 121.5503 }, type: 'local', category: '運動' },

    // === 宗教寺廟 ===
    { id: 'baoan-temple', address: '保安宮', coordinates: { lat: 25.0731, lng: 121.5154 }, type: 'local', category: '宗教' },
    { id: 'confucius-temple', address: '孔廟', coordinates: { lat: 25.0731, lng: 121.5154 }, type: 'local', category: '宗教' },
    { id: 'xingtian-temple', address: '行天宮', coordinates: { lat: 25.0622, lng: 121.5336 }, type: 'local', category: '宗教' },
    { id: 'zhinan-temple', address: '指南宮', coordinates: { lat: 24.9778, lng: 121.5892 }, type: 'local', category: '宗教' },

    // === 公園綠地 ===
    { id: 'daan-park', address: '大安森林公園', coordinates: { lat: 25.0263, lng: 121.5436 }, type: 'local', category: '公園' },
    { id: 'yangmingshan', address: '陽明山', coordinates: { lat: 25.1896, lng: 121.5265 }, type: 'local', category: '公園' },
    { id: 'maokong', address: '貓空', coordinates: { lat: 24.9681, lng: 121.5828 }, type: 'local', category: '公園' },
    { id: 'bitan', address: '碧潭', coordinates: { lat: 24.9489, lng: 121.5373 }, type: 'local', category: '公園' },
    { id: 'elephant-mountain', address: '象山', coordinates: { lat: 25.0225, lng: 121.5714 }, type: 'local', category: '公園' }
  ];

  // 地址搜索函數
  const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
    if (!query || query.length < 2) return [];

    try {
      // 1. 搜索本地數據庫
      const localResults = localLocations.filter(location =>
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.category?.includes(query)
      );

      // 2. 嘗試使用Azure Maps Search API (如果可用)
      let azureResults: LocationSuggestion[] = [];
      try {
        const azureResponse = await searchWithAzureMaps(query);
        azureResults = azureResponse;
      } catch (error) {
        console.log('Azure Maps search not available, using local data only');
      }

      // 3. 合併並去重結果
      const allResults = [...localResults, ...azureResults];
      const uniqueResults = allResults.filter((result, index, self) =>
        index === self.findIndex(r => r.address === result.address)
      );

      // 4. 按相關性排序 (本地結果優先，然後按匹配度)
      return uniqueResults
        .sort((a, b) => {
          // 本地結果優先
          if (a.type === 'local' && b.type !== 'local') return -1;
          if (a.type !== 'local' && b.type === 'local') return 1;
          
          // 完全匹配優先
          const aExact = a.address.toLowerCase() === query.toLowerCase();
          const bExact = b.address.toLowerCase() === query.toLowerCase();
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          
          // 開頭匹配優先
          const aStarts = a.address.toLowerCase().startsWith(query.toLowerCase());
          const bStarts = b.address.toLowerCase().startsWith(query.toLowerCase());
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          
          return 0;
        })
        .slice(0, 8); // 限制結果數量

    } catch (error) {
      console.error('Location search failed:', error);
      return localLocations.filter(location =>
        location.address.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
    }
  };

  // Azure Maps 搜索 API (模擬實現)
  const searchWithAzureMaps = async (query: string): Promise<LocationSuggestion[]> => {
    // 這裡應該調用真正的Azure Maps Search API
    // 目前返回空數組，因為需要Azure Maps配置
    return [];
    
    /* 真正的實現應該是這樣：
    try {
      const response = await fetch(`https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${AZURE_MAPS_KEY}&query=${encodeURIComponent(query)}&countrySet=TW&language=zh-TW`);
      const data = await response.json();
      
      return data.results?.map((result: any, index: number) => ({
        id: `azure-${index}`,
        address: result.address.freeformAddress,
        coordinates: {
          lat: result.position.lat,
          lng: result.position.lon
        },
        type: 'azure' as const,
        category: result.poi?.categories?.[0]?.name || '地點'
      })) || [];
    } catch (error) {
      console.error('Azure Maps search failed:', error);
      return [];
    }
    */
  };

  // 處理地址輸入變化
  const handleLocationChange = (value: string, isFrom: boolean) => {
    if (isFrom) {
      setFromLocation(value);
      setShowFromSuggestions(true);
    } else {
      setToLocation(value);
      setShowToSuggestions(true);
    }

    // 清除之前的搜索計時器
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // 設置新的搜索計時器
    const newTimeout = setTimeout(async () => {
      if (value.length >= 1) {
        const suggestions = await searchLocations(value);
        if (isFrom) {
          setFromSuggestions(suggestions);
        } else {
          setToSuggestions(suggestions);
        }
      } else {
        if (isFrom) {
          setFromSuggestions([]);
        } else {
          setToSuggestions([]);
        }
      }
    }, 300);

    setSearchTimeout(newTimeout);
  };

  // 選擇地址建議
  const selectSuggestion = (suggestion: LocationSuggestion, isFrom: boolean) => {
    if (isFrom) {
      setFromLocation(suggestion.address);
      setFromSuggestions([]);
      setShowFromSuggestions(false);
    } else {
      setToLocation(suggestion.address);
      setToSuggestions([]);
      setShowToSuggestions(false);
    }
  };

  // 點擊外部關閉建議
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.location-input-container')) {
        setShowFromSuggestions(false);
        setShowToSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlanRoute = async () => {
    if (!fromLocation || !toLocation) {
      toast.error('請輸入起點和終點');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🗺️ 開始計算路線...');
      
      // 解析地址為座標
      const startCoords = await parseLocation(fromLocation);
      const endCoords = await parseLocation(toLocation);
      
      const routeOptions = {
        start: startCoords,
        end: endCoords,
        preferSafety: routeType === 'safest',
        avoidHazardTypes: avoidHazards,
        mode: travelMode as 'driving' | 'walking'
      };

      console.log('🗺️ 請求路線規劃:', routeOptions);
      
      const response = await mapApi.planRoute(routeOptions);
      
      console.log('✅ 路線計算完成:', response);
      setRouteResult(response);
      
      // 根據資料來源顯示不同提示
      if ((response as any).precision === 'ultra_high') {
        toast.success(`🎯 Azure Maps 精確路線規劃完成！`);
      } else {
        toast.success('✅ 路線規劃完成');
      }
      
    } catch (error) {
      console.error('❌ 路線計算失敗:', error);
      toast.error('路線計算失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  // 地址解析函數 (優先使用建議的座標)
  const parseLocation = async (location: string) => {
    // 首先檢查是否為已知的本地地點
    const localMatch = localLocations.find(loc => 
      loc.address.toLowerCase() === location.toLowerCase()
    );
    
    if (localMatch) {
      return localMatch.coordinates;
    }
    
    // 如果沒有精確匹配，使用部分匹配
    const partialMatch = localLocations.find(loc =>
      loc.address.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(loc.address.toLowerCase())
    );
    
    if (partialMatch) {
      return partialMatch.coordinates;
    }

    // 預設返回台北101
    console.warn(`未找到地點: ${location}，使用預設座標`);
    return { lat: 25.0338, lng: 121.5645 };
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} 分鐘`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} 公尺`;
    }
    return `${(meters / 1000).toFixed(1)} 公里`;
  };

  const getCurrentRoute = (): RouteResult | null => {
    if (!routeResult) return null;
    switch (routeType) {
      case 'safest':
        return routeResult.safestRoute || null;
      case 'fastest':
        return routeResult.fastestRoute || null;
      case 'balanced':
        return routeResult.balancedRoute || null;
      default:
        return routeResult.safestRoute || null;
    }
  };

  const currentRoute = getCurrentRoute();

  return (
    <div className="fixed inset-4 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* 標題欄 */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FiNavigation className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">智能導航</h2>
            <p className="text-xs sm:text-sm text-gray-600">Azure Maps 精確路線規劃</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* 左側設定面板 */}
        <div className="w-full lg:w-96 p-4 sm:p-6 border-r overflow-y-auto">
          <div className="space-y-6">
            {/* 起終點輸入 */}
            <div className="space-y-4">
              {/* 起點輸入 */}
              <div className="location-input-container relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiMapPin className="inline w-4 h-4 mr-1" />
                  起點
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => handleLocationChange(e.target.value, true)}
                    onFocus={() => setShowFromSuggestions(true)}
                    placeholder="搜索起點地址..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                
                {/* 起點建議列表 */}
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {fromSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => selectSuggestion(suggestion, true)}
                        className="w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {suggestion.address}
                          </div>
                          {suggestion.category && (
                            <div className="text-xs text-gray-500">
                              {suggestion.category} • {suggestion.type === 'local' ? '本地' : 'Azure Maps'}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 終點輸入 */}
              <div className="location-input-container relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FiTarget className="inline w-4 h-4 mr-1" />
                  終點
                </label>
                <div className="relative">
            <input
              type="text"
                    value={toLocation}
                    onChange={(e) => handleLocationChange(e.target.value, false)}
                    onFocus={() => setShowToSuggestions(true)}
                    placeholder="搜索終點地址..."
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                
                {/* 終點建議列表 */}
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {toSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => selectSuggestion(suggestion, false)}
                        className="w-full px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center gap-3"
                      >
                        <FiTarget className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {suggestion.address}
                          </div>
                          {suggestion.category && (
                            <div className="text-xs text-gray-500">
                              {suggestion.category} • {suggestion.type === 'local' ? '本地' : 'Azure Maps'}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 快速地點選擇 */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setFromLocation('台北101');
                    setShowFromSuggestions(false);
                  }}
                  className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  📍 台北101
                </button>
                <button
                  onClick={() => {
                    setFromLocation('台北車站');
                    setShowFromSuggestions(false);
                  }}
                  className="px-3 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  🚉 台北車站
                </button>
            <button
                  onClick={() => {
                    setToLocation('松山機場');
                    setShowToSuggestions(false);
                  }}
                  className="px-3 py-2 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  ✈️ 松山機場
            </button>
            <button
                  onClick={() => {
                    setToLocation('西門町');
                    setShowToSuggestions(false);
                  }}
                  className="px-3 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  🛍️ 西門町
            </button>
          </div>
        </div>

            {/* 旅行模式 */}
        <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                旅行模式
              </label>
              <div className="grid grid-cols-3 gap-2">
                {travelModes.map((mode) => {
                  const IconComponent = mode.icon;
                  return (
            <button
                      key={mode.id}
                      onClick={() => setTravelMode(mode.id as any)}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        travelMode === mode.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-1 ${mode.color}`} />
                      <div className="text-xs font-medium text-gray-700">{mode.label}</div>
                      <div className="text-xs text-gray-500">{mode.speed}</div>
            </button>
                  );
                })}
        </div>
      </div>

            {/* 路線類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                路線類型
              </label>
              <div className="space-y-2">
                {routeTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
            <button
                      key={type.id}
                      onClick={() => setRouteType(type.id as any)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        routeType === type.id
                          ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
                      <div className="flex items-center gap-3">
                        <IconComponent className={`w-5 h-5 ${type.color}`} />
                        <div>
                          <div className="font-medium text-gray-800">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                      </div>
            </button>
                  );
                })}
              </div>
            </div>

            {/* 避開災害 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <FiAlertTriangle className="inline w-4 h-4 mr-1" />
                避開災害類型
              </label>
              <div className="grid grid-cols-2 gap-2">
                {hazardTypes.map((hazard) => (
                  <label
                    key={hazard.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      avoidHazards.includes(hazard.id)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={avoidHazards.includes(hazard.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAvoidHazards([...avoidHazards, hazard.id]);
                        } else {
                          setAvoidHazards(avoidHazards.filter(h => h !== hazard.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-lg">{hazard.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{hazard.label}</span>
                  </label>
          ))}
        </div>
      </div>

            {/* 進階設定 */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <FiSettings className="w-4 h-4" />
                進階設定
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-3 pl-6 border-l-2 border-gray-100">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    避開收費道路
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked className="rounded" />
                    考慮即時交通
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    避開高速公路
                  </label>
                </div>
              )}
            </div>

            {/* 規劃按鈕 */}
            <button
              onClick={handlePlanRoute}
              disabled={isLoading || !fromLocation || !toLocation}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  計算中...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FiNavigation className="w-4 h-4" />
                  開始導航
                </div>
              )}
            </button>
          </div>
        </div>

        {/* 右側結果面板 */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {!routeResult ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <FiTarget className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">請設定起終點並開始導航</p>
                <p className="text-sm mt-2">支援 Azure Maps 精確路線規劃</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>💡 支援地名搜索</div>
                  <div>🗺️ 智能避災路線</div>
                  <div>🚗 多種交通模式</div>
                  <div>📍 精確到公尺</div>
                </div>
        </div>
      </div>
          ) : (
            <div className="space-y-6">
              {/* 路線摘要 */}
              {currentRoute && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">
                      {routeTypes.find(t => t.id === routeType)?.label}路線
                    </h3>
                    {(routeResult as any).precision === 'ultra_high' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        Azure Maps
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatDistance(currentRoute.distance)}
                      </div>
                      <div className="text-xs text-gray-500">總距離</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatDuration(currentRoute.duration)}
                      </div>
                      <div className="text-xs text-gray-500">預估時間</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {currentRoute.path.length}
                      </div>
                      <div className="text-xs text-gray-500">路線點數</div>
                    </div>
                  </div>

                  {/* 警告訊息 */}
                  {currentRoute.warnings && currentRoute.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-yellow-800 text-sm">
                        <FiAlertTriangle className="w-4 h-4" />
                        <div>
                          {currentRoute.warnings.map((warning, index) => (
                            <div key={index}>{warning}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 導航指令 */}
              {currentRoute?.instructions && (
                <div className="bg-white border rounded-lg">
                  <div className="p-4 border-b">
                    <h4 className="font-medium text-gray-800 flex items-center gap-2">
                      <FiTarget className="w-4 h-4" />
                      導航指令
                    </h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {currentRoute.instructions.map((instruction, index) => (
                <div
                  key={index}
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="text-sm text-gray-700">{instruction}</div>
                </div>
              ))}
            </div>
          </div>
              )}

              {/* 系統資訊 */}
              {(routeResult as any).networkStats && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">系統資訊</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>精確度: {(routeResult as any).precision || 'standard'}</div>
                    <div>資料來源: {(routeResult as any).networkStats.isConfigured ? 'Azure Maps API' : 'Mock Data'}</div>
                    {(routeResult as any).networkStats.features && (
                      <div>功能: {(routeResult as any).networkStats.features.slice(0, 3).join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 