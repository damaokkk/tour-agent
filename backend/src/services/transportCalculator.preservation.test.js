/**
 * Preservation Property Tests - transportCalculator
 *
 * 目标：在未修复代码上确认基线行为，修复后这些测试必须继续通过（无回归）。
 * 这些测试在未修复代码上【预期全部通过】。
 *
 * Property 4: Preservation - 已知距离表不变
 * FOR ALL (origin, destination) WHERE NOT isBugCondition_Transport(origin, destination) DO
 *   ASSERT calculateTransportCost(origin, destination).distance === knownDistances[key]
 * END FOR
 *
 * 观察阶段（在未修复代码上）：
 * - calculateTransportCost('上海', '杭州') 返回 distance: 173
 * - calculateTransportCost('北京', '上海') 返回 distance: 1318
 *
 * **Validates: Requirements 3.3, 3.4**
 */

import { describe, it, expect, vi } from 'vitest';

// Mock config：禁用所有外部 API，强制走 estimateDistanceByCity 路径
vi.mock('../config.js', () => ({
  config: {
    hasBaiduMap: false,
    hasAliyunTrain: false,
    baiduMapAk: '',
    aliyunAppCode: '',
  },
}));

import { calculateTransportCost } from './transportCalculator.js';

// ---- 已知距离表（与 transportCalculator.js 中的 knownDistances 完全一致）----

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

// ---- 基线观察测试 ----

describe('Preservation: 基线观察 - 已知城市对距离值', () => {
  /**
   * 基线观察：calculateTransportCost('上海', '杭州') 返回 distance: 173
   * Validates: Requirements 3.3
   */
  it('should return distance: 173 for 上海 → 杭州', async () => {
    const result = await calculateTransportCost('上海', '杭州');
    expect(result).not.toBeNull();
    expect(result.distance).toBe(173);
  });

  /**
   * 基线观察：calculateTransportCost('北京', '上海') 返回 distance: 1318
   * Validates: Requirements 3.3
   */
  it('should return distance: 1318 for 北京 → 上海', async () => {
    const result = await calculateTransportCost('北京', '上海');
    expect(result).not.toBeNull();
    expect(result.distance).toBe(1318);
  });

  /**
   * 基线观察：calculateTransportCost('广州', '深圳') 返回 distance: 139
   * Validates: Requirements 3.3
   */
  it('should return distance: 139 for 广州 → 深圳', async () => {
    const result = await calculateTransportCost('广州', '深圳');
    expect(result).not.toBeNull();
    expect(result.distance).toBe(139);
  });

  /**
   * 基线观察：calculateTransportCost('成都', '重庆') 返回 distance: 308
   * Validates: Requirements 3.3
   */
  it('should return distance: 308 for 成都 → 重庆', async () => {
    const result = await calculateTransportCost('成都', '重庆');
    expect(result).not.toBeNull();
    expect(result.distance).toBe(308);
  });
});

// ---- Property 4: Preservation - 批量验证所有已知城市对 ----

describe('Preservation Property 4: 已知距离表中所有城市对距离值不变', () => {
  /**
   * 批量验证：对 knownDistances 表中所有已知城市对，
   * calculateTransportCost 返回与修复前完全相同的 distance 值。
   *
   * NOT isBugCondition_Transport(origin, destination)：城市对在 knownDistances 表中
   *
   * FOR ALL (origin, destination) WHERE (origin + '-' + destination) IN knownDistances DO
   *   ASSERT calculateTransportCost(origin, destination).distance === knownDistances[key]
   * END FOR
   *
   * **Validates: Requirements 3.3**
   */
  const knownPairs = Object.entries(knownDistances).map(([key, distance]) => {
    const [origin, destination] = key.split('-');
    return { origin, destination, expectedDistance: distance };
  });

  knownPairs.forEach(({ origin, destination, expectedDistance }) => {
    it(`[Preservation] ${origin} → ${destination} should return distance: ${expectedDistance}`, async () => {
      const result = await calculateTransportCost(origin, destination);
      expect(result).not.toBeNull();
      expect(result.distance).toBe(expectedDistance);
    });
  });
});

// ---- Preservation: 已知城市对的交通方式推荐合理性 ----

describe('Preservation: 已知城市对交通方式推荐合理性', () => {
  /**
   * 短距离城市对（< 300km）应推荐高铁/动车
   * Validates: Requirements 3.3
   */
  it('should suggest 高铁/动车 for 上海 → 杭州 (173km)', async () => {
    const result = await calculateTransportCost('上海', '杭州');
    expect(result).not.toBeNull();
    expect(result.suggestedMode).toMatch(/高铁|动车/);
  });

  /**
   * 长距离城市对（> 1500km）应推荐飞机
   * Validates: Requirements 3.3
   */
  it('should suggest 飞机 for 北京 → 广州 (2114km)', async () => {
    const result = await calculateTransportCost('北京', '广州');
    expect(result).not.toBeNull();
    expect(result.suggestedMode).toMatch(/飞机/);
  });

  /**
   * 中距离城市对（300~800km）应推荐高铁
   * Validates: Requirements 3.3
   */
  it('should suggest 高铁 for 成都 → 西安 (742km)', async () => {
    const result = await calculateTransportCost('成都', '西安');
    expect(result).not.toBeNull();
    expect(result.suggestedMode).toMatch(/高铁/);
  });
});

// ---- Preservation: 返回结构完整性 ----

describe('Preservation: calculateTransportCost 返回结构完整性', () => {
  /**
   * 对已知城市对，返回值包含所有必要字段
   * Validates: Requirements 3.3
   */
  it('should return complete result structure for known city pairs', async () => {
    const result = await calculateTransportCost('上海', '杭州');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('distance');
    expect(result).toHaveProperty('suggestedMode');
    expect(result).toHaveProperty('estimatedCost');
    expect(result).toHaveProperty('roundTripCost');
    expect(result).toHaveProperty('isRealPrice');
    expect(result.isRealPrice).toBe(false); // 使用估算，非真实票价
  });

  /**
   * 对已知城市对，estimatedCost > 0 且 roundTripCost = estimatedCost * 2
   * Validates: Requirements 3.3
   */
  it('should have valid cost values for known city pairs', async () => {
    const result = await calculateTransportCost('北京', '上海');
    expect(result).not.toBeNull();
    expect(result.estimatedCost).toBeGreaterThan(0);
    expect(result.roundTripCost).toBe(result.estimatedCost * 2);
  });

  /**
   * 批量验证：所有已知城市对的 estimatedCost > 0
   * Validates: Requirements 3.3
   */
  const samplePairs = [
    ['上海', '杭州'],
    ['北京', '上海'],
    ['广州', '深圳'],
    ['成都', '重庆'],
    ['北京', '成都'],
  ];

  samplePairs.forEach(([origin, destination]) => {
    it(`[Preservation] ${origin} → ${destination} estimatedCost > 0`, async () => {
      const result = await calculateTransportCost(origin, destination);
      expect(result).not.toBeNull();
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.roundTripCost).toBeGreaterThan(0);
    });
  });
});
