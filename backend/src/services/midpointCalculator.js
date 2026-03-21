/**
 * 中点计算器 - 计算多个位置的中心点和推荐城市
 */

import { CITIES } from '../data/cities.js';

/**
 * 将角度转换为弧度
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * 将弧度转换为角度
 */
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * 使用球面几何计算中心点（更精确）
 */
export function calculateCenter(locations) {
  if (!locations || locations.length === 0) {
    return null;
  }

  if (locations.length === 1) {
    return { lat: locations[0].lat, lng: locations[0].lng };
  }

  // 转换为笛卡尔坐标
  let x = 0, y = 0, z = 0;

  for (const loc of locations) {
    const lat = toRad(loc.lat);
    const lng = toRad(loc.lng);

    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }

  // 计算平均值
  x /= locations.length;
  y /= locations.length;
  z /= locations.length;

  // 转换回经纬度
  const centerLng = toDeg(Math.atan2(y, x));
  const centerLat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));

  return { lat: centerLat, lng: centerLng };
}

/**
 * 计算两点之间的距离（公里）- 使用 Haversine 公式
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半径（公里）
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 找到距离中心点最近的城市
 */
export function findNearestCities(center, count = 3) {
  if (!center) return [];

  const citiesWithDistance = CITIES.map((city) => ({
    ...city,
    distance: calculateDistance(center.lat, center.lng, city.lat, city.lng),
  }));

  // 按距离排序
  citiesWithDistance.sort((a, b) => a.distance - b.distance);

  // 返回前 N 个
  return citiesWithDistance.slice(0, count).map((city) => ({
    name: city.name,
    province: city.province,
    lat: city.lat,
    lng: city.lng,
    distance: Math.round(city.distance),
  }));
}

/**
 * 计算中点并返回推荐城市
 */
export function calculateMidpoint(locations) {
  const center = calculateCenter(locations);
  if (!center) return null;

  const recommendations = findNearestCities(center, 3);

  return {
    center,
    recommendations,
  };
}

/**
 * 计算每个参与者到推荐城市的距离
 */
export function calculateDistancesToCities(locations, cities) {
  const result = {};

  for (const city of cities) {
    result[city.name] = locations.map((loc) => ({
      name: loc.name,
      distance: Math.round(calculateDistance(loc.lat, loc.lng, city.lat, city.lng)),
    }));
  }

  return result;
}
