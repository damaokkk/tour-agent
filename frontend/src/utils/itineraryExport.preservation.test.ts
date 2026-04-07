/**
 * Preservation Property Tests - itineraryExport
 *
 * 目标：在未修复代码上确认基线行为，修复后这些测试必须继续通过（无回归）。
 * 这些测试在未修复代码上【预期全部通过】。
 *
 * Property 2: Preservation
 * - 对任意 days.length ≤ 7 的 itinerary，itineraryToText 输出包含所有天数的"第N天"标题
 * - cardRef.current === null 时 exportItinerary('pdf', ...) 继续抛出错误
 * - action === 'share' 时 exportItinerary 继续调用 navigator.share，不受修复影响
 *
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { itineraryToText, exportItinerary } from './itineraryExport';
import type { Itinerary, DayPlan } from './itineraryExport';

// ---- 辅助函数 ----

/**
 * 构造指定天数的 itinerary
 */
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

// ---- Property 5: Preservation - 短行程复制不变 ----

describe('Preservation Property 5: 短行程 itineraryToText 输出包含所有天数标题', () => {
  /**
   * 基线观察：days.length = 1, 3, 7 的行程均输出完整内容
   * Validates: Requirements 3.1
   */
  it('should include 第1天 for days.length = 1', () => {
    const itinerary = makeItinerary(1);
    const text = itineraryToText(itinerary);
    expect(text).toContain('第1天');
  });

  it('should include all day headers for days.length = 3', () => {
    const itinerary = makeItinerary(3);
    const text = itineraryToText(itinerary);
    for (let i = 1; i <= 3; i++) {
      expect(text).toContain(`第${i}天`);
    }
  });

  it('should include all day headers for days.length = 7', () => {
    const itinerary = makeItinerary(7);
    const text = itineraryToText(itinerary);
    for (let i = 1; i <= 7; i++) {
      expect(text).toContain(`第${i}天`);
    }
  });

  /**
   * 属性测试：对任意 days.length ∈ [1, 7] 的 itinerary，
   * itineraryToText 输出包含所有天数的"第N天"标题。
   *
   * NOT isBugCondition_Copy(itinerary)：days.length ≤ 7
   *
   * FOR ALL itinerary WHERE days.length ≤ 7 DO
   *   ASSERT itineraryToText(itinerary) CONTAINS "第N天" FOR ALL N ∈ [1, days.length]
   * END FOR
   *
   * **Validates: Requirements 3.1**
   */
  it('[Property] for any itinerary with days.length ≤ 7, output contains all "第N天" headers', () => {
    fc.assert(
      fc.property(
        // 生成 1~7 天的行程
        fc.integer({ min: 1, max: 7 }),
        (numDays) => {
          const itinerary = makeItinerary(numDays);
          const text = itineraryToText(itinerary);

          // 断言：输出包含所有天数的"第N天"标题
          for (let i = 1; i <= numDays; i++) {
            if (!text.includes(`第${i}天`)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性测试：输出文本包含目的地名称和预算信息
   * Validates: Requirements 3.1
   */
  it('[Property] for any itinerary with days.length ≤ 7, output contains destination and budget', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 100, max: 100000 }),
        (numDays, destination, budget) => {
          const itinerary = makeItinerary(numDays);
          itinerary.destination = destination;
          itinerary.totalBudget = budget;

          const text = itineraryToText(itinerary);

          // 输出应包含目的地和预算
          return text.includes(destination) && text.includes(String(budget));
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---- Preservation: cardRef === null 时继续抛出错误 ----

describe('Preservation: cardRef.current === null 时 exportItinerary 继续抛出错误', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 基线观察：cardRef.current === null 时 exportItinerary('pdf', ...) 抛出 'cardRef is null'
   *
   * Validates: Requirements 3.2
   */
  it('should throw error when cardRef.current is null for pdf export', async () => {
    const itinerary = makeItinerary(3);
    const cardRef = { current: null };

    await expect(
      exportItinerary('pdf', itinerary, cardRef as React.RefObject<HTMLDivElement | null>)
    ).rejects.toThrow('cardRef is null');
  });

  /**
   * cardRef.current === null 时 exportItinerary('image', ...) 也应抛出错误
   *
   * Validates: Requirements 3.2
   */
  it('should throw error when cardRef.current is null for image export', async () => {
    const itinerary = makeItinerary(3);
    const cardRef = { current: null };

    await expect(
      exportItinerary('image', itinerary, cardRef as React.RefObject<HTMLDivElement | null>)
    ).rejects.toThrow('cardRef is null');
  });

  /**
   * 属性测试：对任意天数的行程，cardRef.current === null 时始终抛出错误
   *
   * FOR ALL itinerary, FOR ALL action ∈ ['pdf', 'image'] WHERE cardRef.current === null DO
   *   ASSERT exportItinerary(action, itinerary, cardRef) THROWS
   * END FOR
   *
   * **Validates: Requirements 3.2**
   */
  it('[Property] cardRef.current === null always throws for pdf/image export', async () => {
    const actions: Array<'pdf' | 'image'> = ['pdf', 'image'];

    for (const action of actions) {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 14 }),
          async (numDays) => {
            const itinerary = makeItinerary(numDays);
            const cardRef = { current: null };

            let threw = false;
            try {
              await exportItinerary(action, itinerary, cardRef as React.RefObject<HTMLDivElement | null>);
            } catch {
              threw = true;
            }
            return threw;
          }
        ),
        { numRuns: 20 }
      );
    }
  });
});

// ---- Preservation: share action 继续调用 navigator.share ----

describe('Preservation: action === share 时继续调用 navigator.share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 基线观察：action === 'share' 时调用 navigator.share
   *
   * Validates: Requirements 3.5
   */
  it('should call navigator.share when action is share', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const itinerary = makeItinerary(3);
    const cardRef = { current: null };

    await exportItinerary('share', itinerary, cardRef as React.RefObject<HTMLDivElement | null>);

    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining(itinerary.destination),
      })
    );
  });

  /**
   * share action 传入正确的 title 和 text
   * Validates: Requirements 3.5
   */
  it('should pass correct title and text to navigator.share', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const itinerary = makeItinerary(5);
    itinerary.destination = '上海';
    const cardRef = { current: null };

    await exportItinerary('share', itinerary, cardRef as React.RefObject<HTMLDivElement | null>);

    const callArgs = mockShare.mock.calls[0][0];
    expect(callArgs.title).toContain('上海');
    expect(typeof callArgs.text).toBe('string');
    expect(callArgs.text.length).toBeGreaterThan(0);
  });

  /**
   * navigator.share 不存在时抛出 NOT_SUPPORTED 错误
   * Validates: Requirements 3.5
   */
  it('should throw NOT_SUPPORTED when navigator.share is not available', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const itinerary = makeItinerary(3);
    const cardRef = { current: null };

    await expect(
      exportItinerary('share', itinerary, cardRef as React.RefObject<HTMLDivElement | null>)
    ).rejects.toThrow('NOT_SUPPORTED');
  });

  /**
   * 属性测试：对任意天数的行程，share action 始终调用 navigator.share（不受修复影响）
   *
   * FOR ALL itinerary DO
   *   ASSERT navigator.share IS CALLED when action === 'share'
   * END FOR
   *
   * **Validates: Requirements 3.5**
   */
  it('[Property] share action always calls navigator.share regardless of itinerary size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 14 }),
        async (numDays) => {
          const mockShare = vi.fn().mockResolvedValue(undefined);
          Object.defineProperty(navigator, 'share', {
            value: mockShare,
            writable: true,
            configurable: true,
          });

          const itinerary = makeItinerary(numDays);
          const cardRef = { current: null };

          await exportItinerary('share', itinerary, cardRef as React.RefObject<HTMLDivElement | null>);

          return mockShare.mock.calls.length === 1;
        }
      ),
      { numRuns: 20 }
    );
  });
});
