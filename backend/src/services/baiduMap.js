/**
 * 百度地图服务 - 获取城市数据和逆地理编码
 */

import { config } from '../config.js';

const BAIDU_MAP_API = 'https://api.map.baidu.com';

// ── 逆地理编码缓存 & 限速队列 ──────────────────────────────────────
// 将坐标精度降到小数点后2位（约1km精度），相近位置复用同一缓存
const _geocodeCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时
const MAX_CACHE_SIZE = 500;

// 串行队列，避免并发超限
let _queueRunning = false;
const _queue = [];

function _cacheKey(lat, lng) {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function _enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject });
    if (!_queueRunning) _runQueue();
  });
}

async function _runQueue() {
  _queueRunning = true;
  while (_queue.length > 0) {
    const { fn, resolve, reject } = _queue.shift();
    try {
      resolve(await fn());
    } catch (e) {
      reject(e);
    }
    // 每次调用后等350ms，QPS不超过3（百度地图服务端API默认限制）
    if (_queue.length > 0) await new Promise(r => setTimeout(r, 350));
  }
  _queueRunning = false;
}
// ─────────────────────────────────────────────────────────────────────

/**
 * 获取中国所有城市列表
 * 使用百度地图行政区划查询API
 */
export async function getChinaCities() {
  if (!config.hasBaiduMap) {
    console.warn('[BaiduMap] 未配置百度地图AK，使用默认城市数据');
    return null;
  }

  try {
    // 获取所有省级行政区
    const provinces = await getDistricts('中国', 1);
    const cities = [];

    // 遍历每个省获取其城市
    for (const province of provinces) {
      if (['北京市', '天津市', '上海市', '重庆市'].includes(province.name)) {
        // 直辖市直接添加
        const cityInfo = await getCityLocation(province.name);
        if (cityInfo) {
          cities.push({
            name: province.name.replace('市', ''),
            province: province.name,
            lat: cityInfo.lat,
            lng: cityInfo.lng,
          });
        }
      } else if (province.name.includes('省') || province.name.includes('自治区')) {
        // 获取省内的城市
        const provinceCities = await getDistricts(province.name, 1);
        for (const city of provinceCities) {
          // 过滤掉省直辖县级行政区
          if (city.name.includes('市') && !city.name.includes('省直辖')) {
            const cityInfo = await getCityLocation(city.name);
            if (cityInfo) {
              cities.push({
                name: city.name.replace('市', ''),
                province: province.name.replace(/省|自治区/, ''),
                lat: cityInfo.lat,
                lng: cityInfo.lng,
              });
            }
          }
        }
      }
    }

    return cities;
  } catch (error) {
    console.error('[BaiduMap] 获取城市列表失败:', error);
    return null;
  }
}

/**
 * 获取行政区划
 * @param {string} keyword - 查询关键词
 * @param {number} subAdmin - 子级行政级别 0不返回 1返回
 */
async function getDistricts(keyword, subAdmin = 0) {
  const url = `${BAIDU_MAP_API}/api_region_search/v1/?keyword=${encodeURIComponent(keyword)}&sub_admin=${subAdmin}&ak=${config.baiduMapAk}&output=json`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 0 && data.districts) {
    return data.districts;
  }
  
  return [];
}

/**
 * 获取城市经纬度
 * @param {string} cityName - 城市名称
 */
async function getCityLocation(cityName) {
  const url = `${BAIDU_MAP_API}/geocoding/v3/?address=${encodeURIComponent(cityName)}&ak=${config.baiduMapAk}&output=json`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.status === 0 && data.result && data.result.location) {
    return {
      lat: data.result.location.lat,
      lng: data.result.location.lng,
    };
  }
  
  return null;
}

/**
 * 逆地理编码 - 经纬度转地址（带缓存 + 限速队列）
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 */
export async function reverseGeocode(lat, lng) {
  if (!config.hasBaiduMap) {
    return '未知位置';
  }

  const key = _cacheKey(lat, lng);

  // 命中缓存
  const cached = _geocodeCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    console.log(`[BaiduMap] 逆地理编码缓存命中: ${key}`);
    return cached.value;
  }

  // 入队串行执行，避免并发超限
  return _enqueue(async () => {
    // 二次检查，防止队列中重复请求
    const cached2 = _geocodeCache.get(key);
    if (cached2 && Date.now() - cached2.ts < CACHE_TTL) {
      return cached2.value;
    }

    try {
      const url = `${BAIDU_MAP_API}/reverse_geocoding/v3/?ak=${config.baiduMapAk}&output=json&coordtype=wgs84ll&location=${lat},${lng}`;
      const response = await fetch(url);
      const data = await response.json();

      let result = '未知位置';
      if (data.status === 0 && data.result) {
        const address = data.result.formatted_address;
        const poi = data.result.pois && data.result.pois[0];
        result = poi ? `${address} (${poi.name})` : address;
      }

      // 写入缓存，超出上限时清除最旧的条目
      if (_geocodeCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = _geocodeCache.keys().next().value;
        _geocodeCache.delete(oldestKey);
      }
      _geocodeCache.set(key, { value: result, ts: Date.now() });

      return result;
    } catch (error) {
      console.error('[BaiduMap] 逆地理编码失败:', error);
      return '未知位置';
    }
  });
}

/**
 * 搜索城市（支持模糊搜索）
 * @param {string} keyword - 搜索关键词
 */
export async function searchCities(keyword) {
  if (!config.hasBaiduMap) {
    return [];
  }

  try {
    const url = `${BAIDU_MAP_API}/place/v2/suggestion?query=${encodeURIComponent(keyword)}&region=中国&city_limit=false&ak=${config.baiduMapAk}&output=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 0 && data.result) {
      return data.result.map(item => ({
        name: item.name,
        province: item.province,
        city: item.city,
        district: item.district,
        lat: item.location?.lat,
        lng: item.location?.lng,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[BaiduMap] 搜索城市失败:', error);
    return [];
  }
}

/**
 * 获取城市详细信息（包含边界、中心点等）
 * @param {string} cityName - 城市名称
 */
export async function getCityDetail(cityName) {
  if (!config.hasBaiduMap) {
    return null;
  }

  try {
    const url = `${BAIDU_MAP_API}/place/v2/search?query=${encodeURIComponent(cityName)}&region=中国&ak=${config.baiduMapAk}&output=json&scope=2`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 0 && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        name: result.name,
        province: result.province,
        city: result.city,
        lat: result.location?.lat,
        lng: result.location?.lng,
        address: result.address,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[BaiduMap] 获取城市详情失败:', error);
    return null;
  }
}
