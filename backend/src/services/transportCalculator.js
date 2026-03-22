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

  const key = `${origin}-${destination}`;
  if (knownDistances[key]) {
    return {
      distance: knownDistances[key],
      duration: Math.round(knownDistances[key] / 80 * 60), // 按80km/h估算
      mode: 'estimated'
    };
  }

  // 如果没有已知距离，根据城市等级估算
  return estimateByCityTier(origin, destination);
}

/**
 * 根据城市等级估算距离
 */
function estimateByCityTier(origin, destination) {
  // 一线城市
  const tier1 = ['北京', '上海', '广州', '深圳'];
  // 新一线/二线城市
  const tier2 = ['成都', '杭州', '重庆', '武汉', '西安', '苏州', '南京', '长沙', '天津', '郑州', '东莞', '青岛', '昆明', '宁波', '合肥'];
  
  const originTier = tier1.includes(origin) ? 1 : tier2.includes(origin) ? 2 : 3;
  const destTier = tier1.includes(destination) ? 1 : tier2.includes(destination) ? 2 : 3;
  
  // 估算距离（公里）
  let estimatedDistance;
  if (originTier === 1 && destTier === 1) {
    estimatedDistance = 1200; // 一线城市之间
  } else if (originTier === 1 || destTier === 1) {
    estimatedDistance = 800; // 一线到其他
  } else if (originTier === 2 && destTier === 2) {
    estimatedDistance = 600; // 二线城市之间
  } else {
    estimatedDistance = 1000; // 其他情况
  }
  
  return {
    distance: estimatedDistance,
    duration: Math.round(estimatedDistance / 80 * 60),
    mode: 'estimated'
  };
}

/**
 * 从聚合数据火车票API获取真实票价
 * @param {string} origin - 出发城市
 * @param {string} destination - 目的城市
 * @returns {Promise<{distance: number, suggestedMode: string, estimatedCost: number, roundTripCost: number, isRealPrice: boolean}|null>}
 */
async function getAliyunTrainPrice(origin, destination) {
  if (!config.hasAliyunTrain) {
    return null;
  }

  try {
    // 获取今天的日期
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 调用阿里云市场火车票API（使用AppCode认证）
    const url = `${ALIYUN_TRAIN_API}?date=${dateStr}&start=${encodeURIComponent(origin)}&end=${encodeURIComponent(destination)}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `APPCODE ${config.aliyunAppCode}`
      },
      timeout: 5000
    });
    
    const data = await response.json();
    
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
export async function calculateTransportCost(origin, destination) {
  // 首先尝试从阿里云市场获取真实火车票价格
  const aliyunPriceInfo = await getAliyunTrainPrice(origin, destination);
  
  if (aliyunPriceInfo) {
    console.log('[Transport] 使用阿里云真实火车票价格:', aliyunPriceInfo);
    return aliyunPriceInfo;
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
  let estimatedCost; // 单程费用
  
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
  
  return {
    distance,
    suggestedMode,
    estimatedCost, // 单程
    roundTripCost: estimatedCost * 2, // 往返
    duration: routeInfo.duration,
    isRealPrice: false
  };
}
