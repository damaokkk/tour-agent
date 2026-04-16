/**
 * 交通费用计算服务
 * 三级降级架构：本地12306 DB → 阿里云API → 基于距离估算
 */

import { config } from '../config.js';
import { findBestDirectTrain } from './localTrainDB.js';

// ============================================================
// 工具函数（任务5提取）
// ============================================================

/**
 * 解析 costtime 字符串为分钟数
 * 支持格式：X小时Y分、X小时、Y分钟、Y分
 * @param {string} s
 * @returns {number|null}
 */
export function parseCosttime(s) {
  if (!s || typeof s !== 'string') {
    console.warn('[Transport] parseCosttime: 无效输入', s);
    return null;
  }

  const hourMinMatch = s.match(/^(\d+)小时(\d+)分/);
  if (hourMinMatch) {
    return parseInt(hourMinMatch[1]) * 60 + parseInt(hourMinMatch[2]);
  }

  const hourMatch = s.match(/^(\d+)小时$/);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }

  const minFullMatch = s.match(/^(\d+)分钟$/);
  if (minFullMatch) {
    return parseInt(minFullMatch[1]);
  }

  const minMatch = s.match(/^(\d+)分$/);
  if (minMatch) {
    return parseInt(minMatch[1]);
  }

  console.warn('[Transport] parseCosttime: 无法解析字符串', s);
  return null;
}

/**
 * 根据距离选择出行方式和通勤时长
 * @param {number} distance
 * @returns {{ suggestedMode: string, duration: number }}
 */
export function selectModeAndDuration(distance) {
  if (distance <= 300) {
    return { suggestedMode: '高铁/动车', duration: Math.round(distance / 250 * 60) };
  } else if (distance <= 800) {
    return { suggestedMode: '高铁', duration: Math.round(distance / 250 * 60) };
  } else if (distance <= 1500) {
    return { suggestedMode: '高铁/飞机', duration: Math.round(distance / 250 * 60) };
  } else {
    return { suggestedMode: '飞机', duration: Math.round(distance / 800 * 60) + 120 };
  }
}

/**
 * 根据距离估算单程单人费用
 * @param {number} distance
 * @returns {number}
 */
export function estimateCostByDistance(distance) {
  if (distance <= 300) {
    return Math.max(Math.round(distance * 0.5), 30);
  } else if (distance <= 800) {
    return Math.round(distance * 0.45);
  } else if (distance <= 1500) {
    return Math.min(Math.round(distance * 0.4), 800);
  } else {
    if (distance <= 2000) return 1000;
    if (distance <= 2500) return 1500;
    return 2000;
  }
}

/**
 * 从车次对象中按优先级提取票价
 * 优先级：priceed → priceyd → priceyz → pricerz
 * @param {Object} train
 * @returns {number}
 */
export function extractPrice(train) {
  for (const field of ['priceed', 'priceyd', 'priceyz', 'pricerz']) {
    const val = parseFloat(train[field]);
    if (val > 0) return val;
  }
  return 0;
}

// ============================================================
// 内部常量与缓存
// ============================================================

const BAIDU_MAP_API = 'https://api.map.baidu.com';
const ALIYUN_TRAIN_API = 'http://jisutrainf.market.alicloudapi.com/train/station2s';

const CACHE_TTL_MS = 60 * 60 * 1000;
const _cache = new Map();

function getCachedResult(origin, destination) {
  const key = `${origin}:${destination}`;
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    _cache.delete(key);
    return null;
  }
  return { ...entry.result, fromCache: true };
}

function setCacheResult(origin, destination, result) {
  const key = `${origin}:${destination}`;
  _cache.set(key, {
    result: { ...result, fromCache: false },
    expiry: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================================
// 路线信息（保留，供其他模块使用）
// ============================================================

/**
 * 获取两个城市间的距离和路线信息
 * @param {string} origin
 * @param {string} destination
 * @returns {Promise<{distance: number, duration: number, mode: string}|null>}
 */
export async function getRouteInfo(origin, destination) {
  if (!config.hasBaiduMap) {
    console.warn('[Transport] 未配置百度地图AK，使用估算距离');
    return estimateDistanceByCity(origin, destination);
  }
  try {
    const url = `${BAIDU_MAP_API}/direction/v2/driving?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&ak=${config.baiduMapAk}&output=json`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 0 && data.result && data.result.routes && data.result.routes.length > 0) {
      const route = data.result.routes[0];
      return {
        distance: Math.round(route.distance / 1000),
        duration: Math.round(route.duration / 60),
        mode: 'driving'
      };
    }
    return estimateDistanceByCity(origin, destination);
  } catch (error) {
    console.error('[Transport] 获取路线信息失败:', error);
    return estimateDistanceByCity(origin, destination);
  }
}

async function estimateDistanceByCity(origin, destination) {
  const knownDistances = {
    '北京-上海': 1318, '上海-北京': 1318,
    '北京-广州': 2114, '广州-北京': 2114,
    '北京-深圳': 2163, '深圳-北京': 2163,
    '北京-杭州': 1279, '杭州-北京': 1279,
    '北京-成都': 1808, '成都-北京': 1808,
    '北京-西安': 1084, '西安-北京': 1084,
    '北京-武汉': 1158, '武汉-北京': 1158,
    '北京-南京': 1023, '南京-北京': 1023,
    '上海-广州': 1440, '广州-上海': 1440,
    '上海-深圳': 1443, '深圳-上海': 1443,
    '上海-杭州': 173,  '杭州-上海': 173,
    '上海-南京': 298,  '南京-上海': 298,
    '上海-苏州': 104,  '苏州-上海': 104,
    '上海-成都': 1970, '成都-上海': 1970,
    '广州-深圳': 139,  '深圳-广州': 139,
    '广州-成都': 1660, '成都-广州': 1660,
    '广州-武汉': 988,  '武汉-广州': 988,
    '深圳-成都': 1700, '成都-深圳': 1700,
    '杭州-南京': 247,  '南京-杭州': 247,
    '杭州-成都': 1840, '成都-杭州': 1840,
    '成都-重庆': 308,  '重庆-成都': 308,
    '成都-西安': 742,  '西安-成都': 742,
    '南京-武汉': 518,  '武汉-南京': 518,
    '北京-乌鲁木齐': 2500, '乌鲁木齐-北京': 2500,
    '上海-乌鲁木齐': 3200, '乌鲁木齐-上海': 3200,
    '广州-乌鲁木齐': 3500, '乌鲁木齐-广州': 3500,
    '深圳-乌鲁木齐': 3550, '乌鲁木齐-深圳': 3550,
    '成都-乌鲁木齐': 2800, '乌鲁木齐-成都': 2800,
    '重庆-乌鲁木齐': 3000, '乌鲁木齐-重庆': 3000,
    '西安-乌鲁木齐': 2100, '乌鲁木齐-西安': 2100,
    '北京-哈尔滨': 1240, '哈尔滨-北京': 1240,
    '上海-哈尔滨': 2360, '哈尔滨-上海': 2360,
    '广州-哈尔滨': 3100, '哈尔滨-广州': 3100,
    '成都-哈尔滨': 2400, '哈尔滨-成都': 2400,
    '重庆-哈尔滨': 2500, '哈尔滨-重庆': 2500,
    '北京-昆明': 2100,  '昆明-北京': 2100,
    '上海-昆明': 2100,  '昆明-上海': 2100,
    '广州-昆明': 1250,  '昆明-广州': 1250,
    '成都-昆明': 1100,  '昆明-成都': 1100,
    '重庆-昆明': 1050,  '昆明-重庆': 1050,
    '北京-兰州': 1700,  '兰州-北京': 1700,
    '上海-兰州': 1900,  '兰州-上海': 1900,
    '成都-兰州': 900,   '兰州-成都': 900,
    '西安-兰州': 680,   '兰州-西安': 680,
    '北京-沈阳': 700,   '沈阳-北京': 700,
    '上海-沈阳': 1500,  '沈阳-上海': 1500,
    '北京-长春': 1000,  '长春-北京': 1000,
    '上海-长春': 1800,  '长春-上海': 1800,
    '成都-西藏': 2000,  '西藏-成都': 2000,
    '北京-呼和浩特': 480, '呼和浩特-北京': 480,
    '北京-银川': 1100,  '银川-北京': 1100,
    '西安-银川': 600,   '银川-西安': 600,
  };
  const key = `${origin}-${destination}`;
  if (knownDistances[key]) {
    return {
      distance: knownDistances[key],
      duration: Math.round(knownDistances[key] / 80 * 60),
      mode: 'estimated'
    };
  }
  return estimateByCityTier(origin, destination);
}

function estimateByCityTier(origin, destination) {
  const regions = {
    华东: ['上海', '杭州', '南京', '苏州', '宁波', '合肥', '无锡', '南昌', '福州', '厦门', '温州'],
    华南: ['广州', '深圳', '东莞', '佛山', '珠海', '南宁', '海口', '三亚'],
    华北: ['北京', '天津', '石家庄', '济南', '青岛', '太原', '呼和浩特'],
    华中: ['武汉', '郑州', '长沙', '合肥'],
    西南: ['成都', '重庆', '昆明', '贵阳', '拉萨'],
    西北: ['西安', '兰州', '乌鲁木齐', '银川', '西宁'],
    东北: ['沈阳', '哈尔滨', '长春', '大连'],
  };
  const getRegion = (city) => {
    for (const [region, cities] of Object.entries(regions)) {
      if (cities.includes(city)) return region;
    }
    return null;
  };
  const originRegion = getRegion(origin);
  const destRegion = getRegion(destination);
  const adjacentPairs = new Set([
    '华东-华南', '华南-华东', '华东-华北', '华北-华东',
    '华东-华中', '华中-华东', '华北-华中', '华中-华北',
    '华北-东北', '东北-华北', '华北-西北', '西北-华北',
    '华中-西南', '西南-华中', '华中-华南', '华南-华中',
    '西南-西北', '西北-西南', '华南-西南', '西南-华南',
  ]);
  const farPairs = new Set([
    '华东-西北', '西北-华东', '华东-西南', '西南-华东',
    '华东-东北', '东北-华东', '华南-西北', '西北-华南',
    '华南-东北', '东北-华南', '华南-华北', '华北-华南',
    '西南-东北', '东北-西南', '西北-东北', '东北-西北',
  ]);
  let estimatedDistance;
  if (originRegion && destRegion) {
    if (originRegion === destRegion) {
      estimatedDistance = 450;
    } else {
      const pairKey = `${originRegion}-${destRegion}`;
      if (farPairs.has(pairKey)) {
        estimatedDistance = 2200;
      } else if (adjacentPairs.has(pairKey)) {
        estimatedDistance = 900;
      } else {
        estimatedDistance = 1500;
      }
    }
  } else {
    estimatedDistance = 1200;
  }
  return {
    distance: estimatedDistance,
    duration: Math.round(estimatedDistance / 80 * 60),
    mode: 'estimated',
    isEstimated: true,
  };
}

// ============================================================
// AliyunTrainAPI 查询
// ============================================================

async function queryAliyunTrainAPI(origin, destination) {
  if (!config.hasAliyunTrain) return null;
  try {
    const url = `${ALIYUN_TRAIN_API}?start=${encodeURIComponent(origin)}&end=${encodeURIComponent(destination)}&ishigh=1`;
    const response = await fetch(url, {
      headers: { 'Authorization': `APPCODE ${config.aliyunAppCode}` },
    });
    const data = await response.json();
    if (data.status === '0' && data.result && data.result.list && data.result.list.length > 0) {
      return data.result.list;
    }
    return null;
  } catch (e) {
    console.warn('[Transport] AliyunTrainAPI 查询失败:', e.message);
    return null;
  }
}

function selectBestTrainFromAPI(trainList) {
  const gdTrains = trainList.filter(t => t.trainno && (t.trainno.startsWith('G') || t.trainno.startsWith('D')));
  const candidates = gdTrains.length > 0 ? gdTrains : trainList;
  let best = null;
  let bestMinutes = Infinity;
  for (const train of candidates) {
    const minutes = parseCosttime(train.costtime);
    if (minutes !== null && minutes < bestMinutes) {
      bestMinutes = minutes;
      best = train;
    }
  }
  return best;
}

// ============================================================
// 主入口：calculateTransportCost
// ============================================================

export async function calculateTransportCost(origin, destination, travelers = 1) {
  if (!origin || !destination || origin === destination) {
    return null;
  }

  const cached = getCachedResult(origin, destination);
  if (cached) {
    return adjustCostForTravelers(cached, travelers);
  }

  let result = null;

  const localTrainResult = findBestDirectTrain(origin, destination);
  if (localTrainResult) {
    const routeInfo = await getRouteInfo(origin, destination);
    const distance = routeInfo ? routeInfo.distance : 500;
    const { suggestedMode } = selectModeAndDuration(distance);
    result = {
      distance,
      suggestedMode,
      estimatedCost: estimateCostByDistance(distance),
      roundTripCost: estimateCostByDistance(distance) * 2,
      duration: localTrainResult.duration,
      isRealPrice: false,
      dataSource: 'local_train_db',
      fromCache: false,
      trainNumber: localTrainResult.trainNumber,
      trainType: localTrainResult.trainType,
      originStation: localTrainResult.originStation,
      destStation: localTrainResult.destStation,
    };
  }

  if (!result) {
    const apiTrains = await queryAliyunTrainAPI(origin, destination);
    if (apiTrains) {
      const bestTrain = selectBestTrainFromAPI(apiTrains);
      if (bestTrain) {
        const routeInfo = await getRouteInfo(origin, destination);
        const distance = routeInfo ? routeInfo.distance : 500;
        const price = extractPrice(bestTrain);
        const duration = parseCosttime(bestTrain.costtime) || Math.round(distance / 250 * 60);
        result = {
          distance,
          suggestedMode: '高铁/动车',
          estimatedCost: price > 0 ? price : estimateCostByDistance(distance),
          roundTripCost: price > 0 ? price * 2 : estimateCostByDistance(distance) * 2,
          duration,
          isRealPrice: price > 0,
          dataSource: 'aliyun_train_api',
          fromCache: false,
          trainNumber: bestTrain.trainno,
        };
      }
    }
  }

  if (!result) {
    const routeInfo = await getRouteInfo(origin, destination);
    const distance = routeInfo ? routeInfo.distance : 500;
    const { suggestedMode, duration } = selectModeAndDuration(distance);
    result = {
      distance,
      suggestedMode,
      estimatedCost: estimateCostByDistance(distance),
      roundTripCost: estimateCostByDistance(distance) * 2,
      duration,
      isRealPrice: false,
      dataSource: 'distance_estimation',
      fromCache: false,
    };
  }

  setCacheResult(origin, destination, result);
  return adjustCostForTravelers(result, travelers);
}

export function adjustCostForTravelers(result, travelers) {
  if (!result) return null;
  if (travelers <= 1) {
    return { ...result };
  }
  return {
    ...result,
    estimatedCostPerPerson: result.estimatedCost,
    roundTripCostPerPerson: result.roundTripCost,
    estimatedCost: result.estimatedCost * travelers,
    roundTripCost: result.roundTripCost * travelers,
    travelers,
  };
}
