// 中国主要城市经纬度数据
// 包含：直辖市、省会城市、地级市、热门旅游城市
// 数据来源：公开地理信息

export interface City {
  name: string;      // 城市名称（带"市"后缀）
  lat: number;       // 纬度
  lng: number;       // 经度
  province: string;  // 所属省份
  hot?: boolean;     // 是否热门旅游城市
}

// 主要城市列表（约150个）
export const CITIES: City[] = [
  // 直辖市
  { name: "北京市", lat: 39.9042, lng: 116.4074, province: "北京", hot: true },
  { name: "上海市", lat: 31.2304, lng: 121.4737, province: "上海", hot: true },
  { name: "天津市", lat: 39.1252, lng: 117.1904, province: "天津" },
  { name: "重庆市", lat: 29.5630, lng: 106.5516, province: "重庆", hot: true },

  // 河北省
  { name: "石家庄市", lat: 38.0428, lng: 114.5149, province: "河北" },
  { name: "唐山市", lat: 39.6292, lng: 118.1802, province: "河北" },
  { name: "秦皇岛市", lat: 39.9354, lng: 119.5982, province: "河北", hot: true },
  { name: "保定市", lat: 38.8739, lng: 115.4646, province: "河北" },
  { name: "承德市", lat: 40.9510, lng: 117.9328, province: "河北", hot: true },

  // 山西省
  { name: "太原市", lat: 37.8706, lng: 112.5489, province: "山西" },
  { name: "大同市", lat: 40.0768, lng: 113.3001, province: "山西", hot: true },
  { name: "晋中市", lat: 37.6870, lng: 112.7527, province: "山西" },

  // 内蒙古
  { name: "呼和浩特市", lat: 40.8414, lng: 111.7519, province: "内蒙古" },
  { name: "包头市", lat: 40.6586, lng: 109.8404, province: "内蒙古" },
  { name: "呼伦贝尔市", lat: 49.2116, lng: 119.7657, province: "内蒙古", hot: true },

  // 辽宁省
  { name: "沈阳市", lat: 41.8057, lng: 123.4315, province: "辽宁" },
  { name: "大连市", lat: 38.9140, lng: 121.6147, province: "辽宁", hot: true },
  { name: "鞍山市", lat: 41.1086, lng: 122.9943, province: "辽宁" },
  { name: "丹东市", lat: 40.1243, lng: 124.3545, province: "辽宁" },

  // 吉林省
  { name: "长春市", lat: 43.8171, lng: 125.3235, province: "吉林" },
  { name: "吉林市", lat: 43.8509, lng: 126.5603, province: "吉林" },
  { name: "延边朝鲜族自治州", lat: 42.9083, lng: 129.5086, province: "吉林", hot: true },

  // 黑龙江省
  { name: "哈尔滨市", lat: 45.8038, lng: 126.5350, province: "黑龙江", hot: true },
  { name: "齐齐哈尔市", lat: 47.3543, lng: 123.9182, province: "黑龙江" },
  { name: "牡丹江市", lat: 44.5513, lng: 129.6332, province: "黑龙江" },
  { name: "大庆市", lat: 46.5893, lng: 125.1038, province: "黑龙江" },

  // 江苏省
  { name: "南京市", lat: 32.0603, lng: 118.7969, province: "江苏", hot: true },
  { name: "苏州市", lat: 31.2989, lng: 120.5853, province: "江苏", hot: true },
  { name: "无锡市", lat: 31.4912, lng: 120.3119, province: "江苏", hot: true },
  { name: "徐州市", lat: 34.2610, lng: 117.1848, province: "江苏" },
  { name: "常州市", lat: 31.5582, lng: 119.9730, province: "江苏" },
  { name: "南通市", lat: 31.9802, lng: 120.8943, province: "江苏" },
  { name: "连云港市", lat: 34.6000, lng: 119.1788, province: "江苏", hot: true },
  { name: "扬州市", lat: 32.3942, lng: 119.4127, province: "江苏", hot: true },
  { name: "镇江市", lat: 32.1877, lng: 119.4528, province: "江苏" },

  // 浙江省
  { name: "杭州市", lat: 30.2741, lng: 120.1551, province: "浙江", hot: true },
  { name: "宁波市", lat: 29.8683, lng: 121.5440, province: "浙江" },
  { name: "温州市", lat: 28.0008, lng: 120.7028, province: "浙江" },
  { name: "嘉兴市", lat: 30.7461, lng: 120.7555, province: "浙江" },
  { name: "湖州市", lat: 30.8943, lng: 120.0880, province: "浙江" },
  { name: "绍兴市", lat: 30.0024, lng: 120.5792, province: "浙江" },
  { name: "金华市", lat: 29.0791, lng: 119.6420, province: "浙江" },
  { name: "舟山市", lat: 30.0160, lng: 122.1068, province: "浙江", hot: true },
  { name: "台州市", lat: 28.6564, lng: 121.4208, province: "浙江" },

  // 安徽省
  { name: "合肥市", lat: 31.8206, lng: 117.2272, province: "安徽" },
  { name: "芜湖市", lat: 31.3529, lng: 118.4331, province: "安徽" },
  { name: "黄山市", lat: 29.7147, lng: 118.3375, province: "安徽", hot: true },
  { name: "安庆市", lat: 30.5435, lng: 117.0635, province: "安徽" },

  // 福建省
  { name: "福州市", lat: 26.0745, lng: 119.2965, province: "福建" },
  { name: "厦门市", lat: 24.4798, lng: 118.0894, province: "福建", hot: true },
  { name: "泉州市", lat: 24.8744, lng: 118.6757, province: "福建", hot: true },
  { name: "莆田市", lat: 25.4541, lng: 119.0076, province: "福建" },
  { name: "漳州市", lat: 24.5130, lng: 117.6471, province: "福建" },
  { name: "武夷山市", lat: 27.7566, lng: 118.0275, province: "福建", hot: true },

  // 江西省
  { name: "南昌市", lat: 28.6820, lng: 115.8579, province: "江西" },
  { name: "景德镇市", lat: 29.2690, lng: 117.2085, province: "江西", hot: true },
  { name: "九江市", lat: 29.7051, lng: 116.0019, province: "江西" },
  { name: "赣州市", lat: 25.8514, lng: 114.9350, province: "江西" },

  // 山东省
  { name: "济南市", lat: 36.6512, lng: 117.1201, province: "山东" },
  { name: "青岛市", lat: 36.0671, lng: 120.3826, province: "山东", hot: true },
  { name: "烟台市", lat: 37.4638, lng: 121.4481, province: "山东" },
  { name: "威海市", lat: 37.5091, lng: 122.1206, province: "山东", hot: true },
  { name: "泰安市", lat: 36.2003, lng: 117.0876, province: "山东" },
  { name: "曲阜市", lat: 35.5810, lng: 116.9864, province: "山东", hot: true },
  { name: "临沂市", lat: 35.1046, lng: 118.3564, province: "山东" },

  // 河南省
  { name: "郑州市", lat: 34.7466, lng: 113.6253, province: "河南" },
  { name: "开封市", lat: 34.7971, lng: 114.3077, province: "河南", hot: true },
  { name: "洛阳市", lat: 34.6197, lng: 112.4540, province: "河南", hot: true },
  { name: "安阳市", lat: 36.0976, lng: 114.3924, province: "河南" },

  // 湖北省
  { name: "武汉市", lat: 30.5928, lng: 114.3055, province: "湖北", hot: true },
  { name: "宜昌市", lat: 30.6919, lng: 111.2864, province: "湖北", hot: true },
  { name: "襄阳市", lat: 32.0090, lng: 112.1225, province: "湖北" },
  { name: "十堰市", lat: 32.6292, lng: 110.7989, province: "湖北" },

  // 湖南省
  { name: "长沙市", lat: 28.2280, lng: 112.9388, province: "湖南", hot: true },
  { name: "株洲市", lat: 27.8278, lng: 113.1340, province: "湖南" },
  { name: "张家界市", lat: 29.1171, lng: 110.4792, province: "湖南", hot: true },
  { name: "岳阳市", lat: 29.3571, lng: 113.1292, province: "湖南" },
  { name: "凤凰县", lat: 27.9483, lng: 109.5992, province: "湖南", hot: true },

  // 广东省
  { name: "广州市", lat: 23.1291, lng: 113.2644, province: "广东", hot: true },
  { name: "深圳市", lat: 22.5431, lng: 114.0579, province: "广东", hot: true },
  { name: "珠海市", lat: 22.2710, lng: 113.5670, province: "广东" },
  { name: "汕头市", lat: 23.3540, lng: 116.7320, province: "广东" },
  { name: "佛山市", lat: 23.0218, lng: 113.1219, province: "广东" },
  { name: "韶关市", lat: 24.8104, lng: 113.5972, province: "广东" },
  { name: "湛江市", lat: 21.2707, lng: 110.3594, province: "广东" },
  { name: "肇庆市", lat: 23.0472, lng: 112.4651, province: "广东" },
  { name: "惠州市", lat: 23.1115, lng: 114.4168, province: "广东" },
  { name: "梅州市", lat: 24.2886, lng: 116.1225, province: "广东" },
  { name: "东莞市", lat: 23.0489, lng: 113.7447, province: "广东" },
  { name: "中山市", lat: 22.5176, lng: 113.3927, province: "广东" },
  { name: "江门市", lat: 22.5789, lng: 113.0819, province: "广东" },

  // 广西壮族自治区
  { name: "南宁市", lat: 22.8170, lng: 108.3665, province: "广西" },
  { name: "柳州市", lat: 24.3255, lng: 109.4155, province: "广西" },
  { name: "桂林市", lat: 25.2740, lng: 110.2993, province: "广西", hot: true },
  { name: "北海市", lat: 21.4819, lng: 109.1011, province: "广西", hot: true },

  // 海南省
  { name: "海口市", lat: 20.0440, lng: 110.1999, province: "海南" },
  { name: "三亚市", lat: 18.2528, lng: 109.5120, province: "海南", hot: true },

  // 四川省
  { name: "成都市", lat: 30.5728, lng: 104.0668, province: "四川", hot: true },
  { name: "自贡市", lat: 29.3390, lng: 104.7784, province: "四川" },
  { name: "攀枝花市", lat: 26.5823, lng: 101.7187, province: "四川" },
  { name: "泸州市", lat: 28.8718, lng: 105.4423, province: "四川" },
  { name: "德阳市", lat: 31.1268, lng: 104.3980, province: "四川" },
  { name: "绵阳市", lat: 31.4675, lng: 104.6796, province: "四川" },
  { name: "广元市", lat: 32.4355, lng: 105.8436, province: "四川" },
  { name: "遂宁市", lat: 30.5130, lng: 105.5929, province: "四川" },
  { name: "乐山市", lat: 29.5820, lng: 103.7654, province: "四川", hot: true },
  { name: "南充市", lat: 30.8373, lng: 106.1107, province: "四川" },
  { name: "宜宾市", lat: 28.7513, lng: 104.6417, province: "四川" },
  { name: "广安市", lat: 30.4564, lng: 106.6334, province: "四川" },
  { name: "达州市", lat: 31.2086, lng: 107.4676, province: "四川" },
  { name: "眉山市", lat: 30.0754, lng: 103.8485, province: "四川" },
  { name: "雅安市", lat: 29.9802, lng: 103.0131, province: "四川" },
  { name: "阿坝藏族羌族自治州", lat: 31.8994, lng: 102.2246, province: "四川", hot: true },
  { name: "甘孜藏族自治州", lat: 30.0494, lng: 101.9623, province: "四川", hot: true },

  // 贵州省
  { name: "贵阳市", lat: 26.6470, lng: 106.6302, province: "贵州" },
  { name: "遵义市", lat: 27.7255, lng: 106.9274, province: "贵州" },
  { name: "安顺市", lat: 26.2531, lng: 105.9476, province: "贵州" },
  { name: "黔东南苗族侗族自治州", lat: 26.5836, lng: 107.9833, province: "贵州", hot: true },

  // 云南省
  { name: "昆明市", lat: 25.0389, lng: 102.7183, province: "云南", hot: true },
  { name: "曲靖市", lat: 25.4900, lng: 103.7968, province: "云南" },
  { name: "丽江市", lat: 26.8722, lng: 100.2330, province: "云南", hot: true },
  { name: "大理白族自治州", lat: 25.6065, lng: 100.2676, province: "云南", hot: true },
  { name: "西双版纳傣族自治州", lat: 22.0074, lng: 100.7974, province: "云南", hot: true },
  { name: "香格里拉市", lat: 27.8297, lng: 99.7008, province: "云南", hot: true },

  // 西藏自治区
  { name: "拉萨市", lat: 29.6500, lng: 91.1000, province: "西藏", hot: true },
  { name: "日喀则市", lat: 29.2669, lng: 88.8806, province: "西藏" },

  // 陕西省
  { name: "西安市", lat: 34.3416, lng: 108.9398, province: "陕西", hot: true },
  { name: "宝鸡市", lat: 34.3619, lng: 107.2377, province: "陕西" },
  { name: "咸阳市", lat: 34.3296, lng: 108.7089, province: "陕西" },
  { name: "延安市", lat: 36.5853, lng: 109.4898, province: "陕西", hot: true },

  // 甘肃省
  { name: "兰州市", lat: 36.0611, lng: 103.8343, province: "甘肃" },
  { name: "嘉峪关市", lat: 39.7720, lng: 98.2892, province: "甘肃" },
  { name: "天水市", lat: 34.5809, lng: 105.7249, province: "甘肃" },
  { name: "张掖市", lat: 38.9259, lng: 100.4498, province: "甘肃", hot: true },
  { name: "敦煌市", lat: 40.1421, lng: 94.6620, province: "甘肃", hot: true },

  // 青海省
  { name: "西宁市", lat: 36.6171, lng: 101.7782, province: "青海" },
  { name: "海东市", lat: 36.5022, lng: 102.1043, province: "青海" },

  // 宁夏回族自治区
  { name: "银川市", lat: 38.4872, lng: 106.2309, province: "宁夏" },

  // 新疆维吾尔自治区
  { name: "乌鲁木齐市", lat: 43.8256, lng: 87.6168, province: "新疆" },
  { name: "克拉玛依市", lat: 45.5799, lng: 84.8892, province: "新疆" },
  { name: "吐鲁番市", lat: 42.9513, lng: 89.1895, province: "新疆" },
  { name: "喀什地区", lat: 39.4677, lng: 75.9938, province: "新疆", hot: true },

  // 港澳台
  { name: "香港", lat: 22.3193, lng: 114.1694, province: "香港", hot: true },
  { name: "澳门", lat: 22.1987, lng: 113.5439, province: "澳门" },
  { name: "台北市", lat: 25.0330, lng: 121.5654, province: "台湾", hot: true },
];

// 搜索城市（支持名称和拼音首字母）
export function searchCities(keyword: string): City[] {
  if (!keyword.trim()) return [];
  const lowerKeyword = keyword.toLowerCase();
  return CITIES.filter(city => 
    city.name.includes(keyword) || 
    city.province.includes(keyword)
  ).slice(0, 10); // 最多返回10个
}

// 根据名称查找城市
export function findCityByName(name: string): City | undefined {
  return CITIES.find(city => city.name === name || city.name === name + '市');
}

// 计算两个城市之间的直线距离（公里）
export function calculateDistance(city1: City, city2: City): number {
  const R = 6371; // 地球半径（公里）
  const dLat = (city2.lat - city1.lat) * Math.PI / 180;
  const dLng = (city2.lng - city1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(city1.lat * Math.PI / 180) * Math.cos(city2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// 计算几何中心
export function calculateCenter(cities: City[]): { lat: number; lng: number } {
  if (cities.length === 0) return { lat: 35.0, lng: 105.0 }; // 中国中心点默认值
  
  const avgLat = cities.reduce((sum, c) => sum + c.lat, 0) / cities.length;
  const avgLng = cities.reduce((sum, c) => sum + c.lng, 0) / cities.length;
  return { lat: avgLat, lng: avgLng };
}

// 找出距离中心点最近的城市
export function findNearestCities(center: { lat: number; lng: number }, count: number = 3): City[] {
  const centerCity = { name: '中心点', lat: center.lat, lng: center.lng, province: '' };
  
  return CITIES
    .map(city => ({
      city,
      distance: calculateDistance(centerCity, city)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map(item => item.city);
}

// 获取热门城市
export function getHotCities(): City[] {
  return CITIES.filter(city => city.hot);
}

// 获取所有省份列表
export function getProvinces(): string[] {
  const provinces = new Set(CITIES.map(city => city.province));
  return Array.from(provinces).sort();
}

// 根据省份获取城市列表
export function getCitiesByProvince(province: string): City[] {
  return CITIES.filter(city => city.province === province).sort((a, b) => {
    // 省会城市排在前面（简单规则：省会通常是第一个字最短的）
    return a.name.length - b.name.length;
  });
}

// 按省份分组的城市数据
export function getCitiesGroupedByProvince(): Record<string, City[]> {
  const grouped: Record<string, City[]> = {};
  CITIES.forEach(city => {
    if (!grouped[city.province]) {
      grouped[city.province] = [];
    }
    grouped[city.province].push(city);
  });
  // 对每个省份内的城市排序
  Object.keys(grouped).forEach(province => {
    grouped[province].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  });
  return grouped;
}
