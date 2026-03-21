/**
 * 城市数据 - 中国主要城市经纬度
 */

export const CITIES = [
  { name: '北京', province: '北京', lat: 39.9042, lng: 116.4074 },
  { name: '上海', province: '上海', lat: 31.2304, lng: 121.4737 },
  { name: '广州', province: '广东', lat: 23.1291, lng: 113.2644 },
  { name: '深圳', province: '广东', lat: 22.5431, lng: 114.0579 },
  { name: '杭州', province: '浙江', lat: 30.2741, lng: 120.1551 },
  { name: '南京', province: '江苏', lat: 32.0603, lng: 118.7969 },
  { name: '苏州', province: '江苏', lat: 31.2989, lng: 120.5853 },
  { name: '成都', province: '四川', lat: 30.5728, lng: 104.0668 },
  { name: '武汉', province: '湖北', lat: 30.5928, lng: 114.3055 },
  { name: '西安', province: '陕西', lat: 34.3416, lng: 108.9398 },
  { name: '重庆', province: '重庆', lat: 29.5630, lng: 106.5516 },
  { name: '天津', province: '天津', lat: 39.1252, lng: 117.1904 },
  { name: '郑州', province: '河南', lat: 34.7466, lng: 113.6253 },
  { name: '长沙', province: '湖南', lat: 28.2280, lng: 112.9388 },
  { name: '青岛', province: '山东', lat: 36.0671, lng: 120.3826 },
  { name: '大连', province: '辽宁', lat: 38.9140, lng: 121.6147 },
  { name: '厦门', province: '福建', lat: 24.4798, lng: 118.0894 },
  { name: '昆明', province: '云南', lat: 25.0389, lng: 102.7183 },
  { name: '济南', province: '山东', lat: 36.6512, lng: 117.1201 },
  { name: '哈尔滨', province: '黑龙江', lat: 45.8038, lng: 126.5350 },
  { name: '沈阳', province: '辽宁', lat: 41.8057, lng: 123.4315 },
  { name: '长春', province: '吉林', lat: 43.8171, lng: 125.3235 },
  { name: '石家庄', province: '河北', lat: 38.0428, lng: 114.5149 },
  { name: '太原', province: '山西', lat: 37.8706, lng: 112.5489 },
  { name: '兰州', province: '甘肃', lat: 36.0611, lng: 103.8343 },
  { name: '贵阳', province: '贵州', lat: 26.6470, lng: 106.6302 },
  { name: '南宁', province: '广西', lat: 22.8170, lng: 108.3665 },
  { name: '海口', province: '海南', lat: 20.0440, lng: 110.1999 },
  { name: '乌鲁木齐', province: '新疆', lat: 43.8256, lng: 87.6168 },
  { name: '拉萨', province: '西藏', lat: 29.6500, lng: 91.1000 },
  { name: '银川', province: '宁夏', lat: 38.4872, lng: 106.2309 },
  { name: '西宁', province: '青海', lat: 36.6171, lng: 101.7782 },
  { name: '呼和浩特', province: '内蒙古', lat: 40.8414, lng: 111.7519 },
  { name: '合肥', province: '安徽', lat: 31.8206, lng: 117.2272 },
  { name: '南昌', province: '江西', lat: 28.6820, lng: 115.8579 },
  { name: '福州', province: '福建', lat: 26.0745, lng: 119.2965 },
  { name: '宁波', province: '浙江', lat: 29.8683, lng: 121.5440 },
  { name: '无锡', province: '江苏', lat: 31.4912, lng: 120.3119 },
  { name: '佛山', province: '广东', lat: 23.0218, lng: 113.1219 },
  { name: '东莞', province: '广东', lat: 23.0489, lng: 113.7447 },
  { name: '珠海', province: '广东', lat: 22.2710, lng: 113.5670 },
  { name: '三亚', province: '海南', lat: 18.2528, lng: 109.5120 },
  { name: '桂林', province: '广西', lat: 25.2740, lng: 110.2993 },
  { name: '丽江', province: '云南', lat: 26.8721, lng: 100.2300 },
  { name: '大理', province: '云南', lat: 25.6065, lng: 100.2676 },
  { name: '张家界', province: '湖南', lat: 29.1171, lng: 110.4792 },
  { name: '九寨沟', province: '四川', lat: 33.2600, lng: 103.9186 },
  { name: '黄山', province: '安徽', lat: 30.1334, lng: 118.1678 },
  { name: '泰山', province: '山东', lat: 36.2000, lng: 117.1000 },
  { name: '武夷山', province: '福建', lat: 27.6600, lng: 117.9800 },
];

/**
 * 根据名称查找城市
 */
export function findCityByName(name) {
  return CITIES.find(city => city.name === name);
}

/**
 * 搜索城市（支持模糊匹配）
 */
export function searchCities(keyword) {
  if (!keyword) return [];
  const lowerKeyword = keyword.toLowerCase();
  return CITIES.filter(city => 
    city.name.includes(keyword) || 
    city.province.includes(keyword)
  );
}
