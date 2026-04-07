/**
 * Bug Condition Exploration Tests - transportCalculator
 *
 * 目标：在未修复代码上确认 bug 存在。
 * 测试断言的是【期望行为】，在未修复代码上【预期失败】，失败本身证明 bug 存在。
 *
 * Bug 4/5 - 距离失真：
 *   estimateByCityTier('重庆', '乌鲁木齐') 在未修复代码上返回 600km，
 *   实际距离约 3000km，严重失真。
 *   此测试断言 result.distance > 1500，在未修复代码上失败，证明 bug 存在。
 *
 * Validates: Requirements 1.4, 1.5
 */

import { describe, it, expect } from 'vitest';

// 直接导入内部函数需要通过 calculateTransportCost 的兜底路径触发
// 由于 estimateByCityTier 是模块内部函数，通过 estimateDistanceByCity 的兜底路径调用
// 我们通过 mock config 禁用外部 API，强制走兜底逻辑

import { vi } from 'vitest';

// Mock config：禁用所有外部 API，强制走 estimateByCityTier 兜底逻辑
vi.mock('../config.js', () => ({
  config: {
    hasBaiduMap: false,
    hasAliyunTrain: false,
    baiduMapAk: '',
    aliyunAppCode: '',
  },
}));

import { calculateTransportCost } from './transportCalculator.js';

// ---- Bug 4/5：距离失真 ----

describe('Bug Condition 4/5: 交通距离失真 - estimateByCityTier 兜底逻辑', () => {
  /**
   * Bug 4/5 核心测试
   *
   * 直接调用 calculateTransportCost('重庆', '乌鲁木齐')，
   * 由于两城市不在 knownDistances 表中，且外部 API 被禁用，
   * 走 estimateByCityTier 兜底逻辑。
   *
   * 未修复代码：重庆在 tier2，乌鲁木齐不在 tier1/tier2，走 else 分支返回 1000km
   * 实际距离：约 3000km
   *
   * 此测试断言 result.distance > 1500（合理下限）
   * 在未修复代码上：返回 600 或 1000，断言失败，证明 bug 存在
   *
   * Validates: Requirements 1.4, 1.5
   */
  it('should return distance > 1500 for 重庆 → 乌鲁木齐 (actual ~3000km)', async () => {
    const result = await calculateTransportCost('重庆', '乌鲁木齐');

    // 期望行为：距离应大于 1500km（实际约 3000km）
    // 未修复代码：重庆(tier2) + 乌鲁木齐(tier3) → else 分支 → 1000km → 断言失败
    // 或：重庆(tier2) + 乌鲁木齐(tier2) → tier2-tier2 → 600km → 断言失败
    expect(result).not.toBeNull();
    expect(result.distance).toBeGreaterThan(1500);
  });

  /**
   * 验证乌鲁木齐的城市等级分类导致的失真
   *
   * 乌鲁木齐不在 tier1 也不在 tier2，走 else 分支返回 1000km
   * 但实际重庆→乌鲁木齐约 3000km，1000km 仍严重低估
   *
   * Validates: Requirements 1.5
   */
  it('should return distance > 2000 for 重庆 → 乌鲁木齐 to be reasonably accurate', async () => {
    const result = await calculateTransportCost('重庆', '乌鲁木齐');

    expect(result).not.toBeNull();
    // 更严格的断言：距离应大于 2000km（实际约 3000km）
    // 未修复代码返回 600 或 1000，均失败，证明 bug 存在
    expect(result.distance).toBeGreaterThan(2000);
  });

  /**
   * 验证推荐交通方式的合理性
   *
   * 重庆→乌鲁木齐约 3000km，应推荐飞机，不应推荐高铁
   * 未修复代码因距离估算为 600km，推荐"高铁/动车"，严重不合理
   *
   * Validates: Requirements 1.4
   */
  it('should suggest 飞机 (not 高铁) for 重庆 → 乌鲁木齐', async () => {
    const result = await calculateTransportCost('重庆', '乌鲁木齐');

    expect(result).not.toBeNull();
    // 期望行为：应推荐飞机（距离 > 1500km）
    // 未修复代码：距离 600km → 推荐"高铁/动车" → 断言失败，证明 bug 存在
    expect(result.suggestedMode).toContain('飞机');
  });

  /**
   * 验证成都→哈尔滨的距离失真（另一个典型跨区域城市对）
   *
   * 成都→哈尔滨实际约 2400km，未修复代码返回 600km（tier2-tier2）
   *
   * Validates: Requirements 1.4, 1.5
   */
  it('should return distance > 1500 for 成都 → 哈尔滨 (actual ~2400km)', async () => {
    const result = await calculateTransportCost('成都', '哈尔滨');

    expect(result).not.toBeNull();
    // 期望行为：距离应大于 1500km
    // 未修复代码：成都(tier2) + 哈尔滨(tier3) → else → 1000km → 断言失败
    expect(result.distance).toBeGreaterThan(1500);
  });
});
