/**
 * 交通费用计算服务
 * 优先使用免费火车票API获取真实票价，失败时使用百度地图路径规划估算
 */

import { config } from '../config.js';

const BAIDU_MAP_API = 'https://api.map.baidu.com';
const ALIYUN_TRAIN_API = 'http://jisutrainf.market.alicloudapi.com/train/station2s'; // 阿里云市场火车票API

/**
 * 获取两个城市间的距离和路线信息
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @returns {Promise<{distance: number, duration: number, mode: string}|null>}
 */
export async function getRouteInfo(origin, destination) {
  if (!config.hasBaiduMap) {
    console.warn('[Transport] 未配置百度地图AK，使用估算距离');
    return estimateDistanceByCity(origin, destination);
  }

  try {
    // 使用百度地图路线规划API（驾车路线）
    const url = `${BAIDU_MAP_API}/direction/v2/driving?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&ak=${config.baiduMapAk}&output=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 0 && data.result && data.result.routes && data.result.routes.length > 0) {
      const route = data.result.routes[0];
      // 距离转换为公里
      const distance = Math.round(route.distance / 1000);
      // 时间转换为分钟
      const duration = Math.round(route.duration / 60);
      
      return {
        distance,
        duration,
        mode: 'driving'
      };
    }
    
    // 如果API调用失败，使用估算
    return estimateDistanceByCity(origin, destination);
  } catch (error) {
    console.error('[Transport] 获取路线信息失败:', error);
    return estimateDistanceByCity(origin, destination);
  }
}

/**
 * 根据城市名称估算距离（当API不可用时使用）
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @returns {Promise<{distance: number, duration: number, mode: string}|null>}
 */
async function estimateDistanceByCity(origin, destination) {
  // 常见城市对距离表（公里）
  const knownDistances = {
    '北京-上海': 1318,
    '上海-北京': 1318,
    '北京-广州': 2114,
    '广州-北京': 2114,
    '北京-深圳': 2163,
    '深圳-北京': 2163,
    '北京-杭州': 1279,
    '杭州-北京': 1279,
    '北京-成都': 1808,
    '成都-北京': 1808,
    '北京-西安': 1084,
    '西安-北京': 1084,
    '北京-武汉': 1158,
    '武汉-北京': 1158,
    '北京-南京': 1023,
    '南京-北京': 1023,
    '上海-广州': 1440,
    '广州-上海': 1440,
    '上海-深圳': 1443,
    '深圳-上海': 1443,
    '上海-杭州': 173,
    '杭州-上海': 173,
    '上海-南京': 298,
    '南京-上海': 298,
    '上海-苏州': 104,
    '苏州-上海': 104,
    '上海-成都': 1970,
    '成都-上海': 1970,
    '广州-深圳': 139,
    '深圳-广州': 139,
    '广州-成都': 1660,
    '成都-广州': 1660,
    '广州-武汉': 988,
    '武汉-广州': 988,
    '深圳-成都': 1700,
    '成都-深圳': 1700,
    '杭州-南京': 247,
    '南京-杭州': 247,
    '杭州-成都': 1840,
    '成都-杭州': 1840,
    '成都-重庆': 308,
    '重庆-成都': 308,
    '成都-西安': 742,
    '西安-成都': 742,
    '南京-武汉': 518,
    '武汉-南京': 518,
  };

  // 补充西部/东北主要城市对
  const extraDistances = {
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
    '北京-昆明': 2100, '昆明-北京': 2100,
    '上海-昆明': 2100, '昆明-上海': 2100,
    '广州-昆明': 1250, '昆明-广州': 1250,
    '成都-昆明': 1100, '昆明-成都': 1100,
    '重庆-昆明': 1050, '昆明-重庆': 1050,
    '北京-兰州': 1700, '兰州-北京': 1700,
    '上海-兰州': 1900, '兰州-上海': 1900,
    '成都-兰州': 900, '兰州-成都': 900,
    '西安-兰州': 680, '兰州-西安': 680,
    '北京-沈阳': 700, '沈阳-北京': 700,
    '上海-沈阳': 1500, '沈阳-上海': 1500,
    '北京-长春': 1000, '长春-北京': 1000,
    '上海-长春': 1800, '长春-上海': 1800,
    '成都-西藏': 2000, '西藏-成都': 2000,
    '北京-呼和浩特': 480, '呼和浩特-北京': 480,
    '北京-银川': 1100, '银川-北京': 1100,
    '西安-银川': 600, '银川-西安': 600,
  };

  const allDistances = { ...knownDistances, ...extraDistances };
  const key = `${origin}-${destination}`;
  if (allDistances[key]) {
    return {
      distance: allDistances[key],
      duration: Math.round(allDistances[key] / 80 * 60),
      mode: 'estimated'
    };
  }

  // 如果没有已知距离，根据地理区域估算
  return estimateByCityTier(origin, destination);
}

/**
 * 根据地理区域估算城市间距离
 * 引入区域分组，跨区域越多距离越远，避免将3000km路程估算为600km
 */
function estimateByCityTier(origin, destination) {
  // 地理区域分组
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

  // 相邻区域对（跨1个区域）
  const adjacentPairs = new Set([
    '华东-华南', '华南-华东',
    '华东-华北', '华北-华东',
    '华东-华中', '华中-华东',
    '华北-华中', '华中-华北',
    '华北-东北', '东北-华北',
    '华北-西北', '西北-华北',
    '华中-西南', '西南-华中',
    '华中-华南', '华南-华中',
    '西南-西北', '西北-西南',
    '华南-西南', '西南-华南',
  ]);

  // 远距离区域对（跨2个及以上区域）
  const farPairs = new Set([
    '华东-西北', '西北-华东',
    '华东-西南', '西南-华东',
    '华东-东北', '东北-华东',
    '华南-西北', '西北-华南',
    '华南-东北', '东北-华南',
    '华南-华北', '华北-华南',
    '西南-东北', '东北-西南',
    '西北-东北', '东北-西北',
    '西北-华南', '华南-西北',
  ]);

  let estimatedDistance;

  if (originRegion && destRegion) {
    if (originRegion === destRegion) {
      estimatedDistance = 450; // 同区域
    } else {
      const pairKey = `${originRegion}-${destRegion}`;
      if (farPairs.has(pairKey)) {
        estimatedDistance = 2200; // 跨2个及以上区域
      } else if (adjacentPairs.has(pairKey)) {
        estimatedDistance = 900; // 跨1个区域
      } else {
        estimatedDistance = 1500; // 其他跨区域情况
      }
    }
  } else {
    // 至少一个城市未知区域，保守估算
    estimatedDistance = 1200;
  }

  return {
    distance: estimatedDistance,
    duration: Math.round(estimatedDistance / 80 * 60),
    mode: 'estimated',
    isEstimated: true,
  };
}

/**
 * 从聚合数据火车票API获取真实票价
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @returns {Promise<{distance: number, suggestedMode: string, estimatedCost: number, roundTripCost: number, isRealPrice: boolean}|null>}
 */
async function getAliyunTrainPrice(origin, destination) {
  console.log(`[Transport] 尝试获取火车票价格: ${origin} -> ${destination}`);
  
  if (!config.hasAliyunTrain) {
    console.log('[Transport] 未配置阿里云AppCode，跳过');
    return null;
  }

  try {
    // 获取今天的日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 调用阿里云市场火车票API（使用AppCode认证）
    const url = `${ALIYUN_TRAIN_API}?date=${dateStr}&start=${encodeURIComponent(origin)}&end=${encodeURIComponent(destination)}`;
    console.log(`[Transport] 请求URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `APPCODE ${config.aliyunAppCode}`
      },
      timeout: 5000
    });
    
    const data = await response.json();
    console.log(`[Transport] API响应 status: ${data.status}, msg: ${data.msg}`);
    
    // 阿里云市场API返回格式：status为0表示成功
    if (data.status === 0 && data.result && data.result.list && data.result.list.length > 0) {
      // 获取第一个车次的信息
      const train = data.result.list[0];
      
      // 获取二等座或硬座价格
      let price = 0;
      let seatType = '';
      
      if (train.priceed) {
        price = parseFloat(train.priceed); // 二等座
        seatType = '二等座';
      } else if (train.priceyz) {
        price = parseFloat(train.priceyz); // 硬座
        seatType = '硬座';
      } else if (train.pricerz) {
        price = parseFloat(train.pricerz); // 软座
        seatType = '软座';
      } else if (train.priceyd) {
        price = parseFloat(train.priceyd); // 一等座
        seatType = '一等座';
      }
      
      if (price > 0) {
        // 计算距离（根据运行时间和平均速度估算）
        const costtime = train.costtime; // 如 "4小时32分"
        const hoursMatch = costtime.match(/(\d+)小时/);
        const minutesMatch = costtime.match(/(\d+)分/);
        const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
        const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
        const totalHours = hours + minutes / 60;
        const estimatedDistance = Math.round(totalHours * 250); // 高铁平均250km/h
        
        return {
          distance: estimatedDistance,
          suggestedMode: `${train.typename}（${train.trainno}）`,
          estimatedCost: price, // 单程
          roundTripCost: price * 2, // 往返
          duration: Math.round(totalHours * 60),
          isRealPrice: true,
          seatType: seatType,
          trainNumber: train.trainno,
          departTime: train.departuretime,
          arriveTime: train.arrivaltime
        };
      }
    }
    
    console.warn('[Transport] 阿里云火车票API返回数据异常:', data);
    return null;
  } catch (error) {
    console.warn('[Transport] 获取阿里云火车票价格失败:', error.message);
    return null;
  }
}

/**
 * 计算交通费用信息
 * 优先使用真实火车票API，失败时使用百度地图估算
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @returns {Promise<{distance: number, suggestedMode: string, estimatedCost: number, roundTripCost: number, isRealPrice: boolean}>}
 */
/**
 * 计算交通费用
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @param {number} travelers - 出行人数（默认1人）
 * @returns {Promise<Object|null>}
 */
export async function calculateTransportCost(origin, destination, travelers = 1) {
  // 首先尝试从阿里云市场获取真实火车票价格
  const aliyunPriceInfo = await getAliyunTrainPrice(origin, destination);
  
  if (aliyunPriceInfo) {
    console.log('[Transport] 使用阿里云真实火车票价格:', aliyunPriceInfo);
    // 按人数调整价格
    return adjustCostForTravelers(aliyunPriceInfo, travelers);
  }
  
  // 失败时使用百度地图路径规划估算（A2方案兜底）
  console.log('[Transport] 使用百度地图估算价格');
  const routeInfo = await getRouteInfo(origin, destination);
  
  if (!routeInfo) {
    return null;
  }

  const { distance } = routeInfo;
  
  // 根据距离推荐交通方式和估算费用
  let suggestedMode;
  let estimatedCost; // 单程费用（单人）
  
  if (distance <= 300) {
    // 300公里以内：高铁/动车
    suggestedMode = '高铁/动车';
    estimatedCost = Math.round(distance * 0.5); // 约0.5元/公里
  } else if (distance <= 800) {
    // 300-800公里：高铁
    suggestedMode = '高铁';
    estimatedCost = Math.round(distance * 0.45); // 约0.45元/公里
  } else if (distance <= 1500) {
    // 800-1500公里：高铁或飞机
    suggestedMode = distance > 1200 ? '飞机/高铁' : '高铁';
    estimatedCost = distance > 1200 ? 800 : Math.round(distance * 0.4);
  } else {
    // 1500公里以上：飞机
    suggestedMode = '飞机';
    if (distance <= 2000) {
      estimatedCost = 1000;
    } else if (distance <= 2500) {
      estimatedCost = 1500;
    } else {
      estimatedCost = 2000;
    }
  }
  
  // 确保最低费用
  estimatedCost = Math.max(estimatedCost, 50);
  
  const baseInfo = {
    distance,
    suggestedMode,
    estimatedCost, // 单程单人
    roundTripCost: estimatedCost * 2, // 往返单人
    duration: routeInfo.duration,
    isRealPrice: false
  };
  
  // 按人数调整价格
  return adjustCostForTravelers(baseInfo, travelers);
}

/**
 * 根据出行人数调整交通费用
 * @param {Object} transportInfo - 交通信息
 * @param {number} travelers - 出行人数
 * @returns {Object}
 */
function adjustCostForTravelers(transportInfo, travelers) {
  if (travelers <= 1) {
    return { ...transportInfo, travelers };
  }
  
  return {
    ...transportInfo,
    travelers,
    estimatedCostPerPerson: transportInfo.estimatedCost, // 保留单人价格
    roundTripCostPerPerson: transportInfo.roundTripCost, // 保留单人往返价格
    estimatedCost: transportInfo.estimatedCost * travelers, // 单程总费用
    roundTripCost: transportInfo.roundTripCost * travelers // 往返总费用
  };
}
