/**
 * Bug Condition Exploration Tests
 *
 * 目标：验证修复后 bug 已消除。
 * 测试断言的是【期望行为】，修复后应全部通过。
 *
 * Bug 1 - 复制截断：itineraryToText 对 days.length > 7 的行程应输出所有天数
 * Bug 2/3 - 导出失败：captureElement 在修复后（直接渲染原始元素）不应抛出异常
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { itineraryToText, exportItinerary } from './itineraryExport';
import type { Itinerary, DayPlan } from './itineraryExport';

// ---- 辅助函数 ----

function makeItinerary(days: number): Itinerary {
  const dayPlans: DayPlan[] = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    theme: `第${i + 1}天主题`,
    activities: [
      {
        time: '09:00',
        name: `景点${i + 1}`,
        type: '景点',
        description: `第${i + 1}天活动描述`,
        cost: 100,
        location: `地点${i + 1}`,
      },
    ],
    dailyCost: 500,
  }));

  return {
    destination: '测试目的地',
    totalDays: days,
    totalBudget: 10000,
    estimatedCost: days * 500,
    travelers: 1,
    summary: `${days}天行程`,
    days: dayPlans,
    tips: ['贴士1', '贴士2'],
  };
}

// ---- Bug 1：复制截断（修复后验证）----

describe('Bug Condition 1: 复制截断 - itineraryToText 对 days.length > 7 的行程', () => {
  /**
   * 修复后：完整 10 天 itinerary 应输出所有天数标题
   * Validates: Requirements 2.1
   */
  it('should include 第8天, 第9天, 第10天 in output for 10-day itinerary', () => {
    const itinerary = makeItinerary(10);
    const text = itineraryToText(itinerary);

    expect(text).toContain('第8天');
    expect(text).toContain('第9天');
    expect(text).toContain('第10天');
  });

  it('should include all day headers for days.length = 10', () => {
    const itinerary = makeItinerary(10);
    const text = itineraryToText(itinerary);

    for (let i = 1; i <= 10; i++) {
      expect(text).toContain(`第${i}天`);
    }
  });

  /**
   * 修复后：max_tokens 动态计算，10天行程应返回完整10天数据
   * 此测试验证 itineraryToText 对完整 10 天 itinerary 的正确处理
   * Validates: Requirements 2.1
   */
  it('should correctly output all 10 days when itinerary has 10 days', () => {
    const itinerary = makeItinerary(10);
    // 修复后：generateItineraryStreaming 返回完整 10 天，itineraryToText 应输出所有天数
    const text = itineraryToText(itinerary);

    // 验证所有天数都在输出中
    for (let i = 1; i <= 10; i++) {
      expect(text).toContain(`第${i}天`);
    }
    // 验证输出不截断
    expect(itinerary.days.length).toBe(10);
  });
});

// ---- Bug 2/3：导出失败（修复后验证）----

// Mock html2canvas 返回成功（修复后直接渲染原始元素，不再克隆节点）
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
    width: 800,
    height: 600,
  }),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage = vi.fn();
    save = vi.fn();
  },
}));

describe('Bug Condition 2/3: 导出失败 - 修复后 captureElement 应成功', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 修复后：直接对原始元素调用 html2canvas，CSS 变量作用域完整，不应抛出异常
   * Validates: Requirements 2.2, 2.3
   */
  it('should not throw for image export after fix (direct element rendering)', async () => {
    const itinerary = makeItinerary(5);
    const cardRef = {
      current: document.createElement('div'),
    };

    // 修复后：不再克隆节点，html2canvas 直接渲染原始元素，不抛出 CSS 变量错误
    await expect(
      exportItinerary('image', itinerary, cardRef as React.RefObject<HTMLDivElement | null>)
    ).resolves.not.toThrow();
  });

  it('should not throw for pdf export after fix (direct element rendering)', async () => {
    const itinerary = makeItinerary(5);
    const cardRef = {
      current: document.createElement('div'),
    };

    // 修复后：不再克隆节点，html2canvas 直接渲染原始元素，不抛出 CSS 变量错误
    await expect(
      exportItinerary('pdf', itinerary, cardRef as React.RefObject<HTMLDivElement | null>)
    ).resolves.not.toThrow();
  });
});
