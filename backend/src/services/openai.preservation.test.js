/**
 * Preservation Property Tests
 *
 * 目标：在未修复代码上确认正常路径（含 |||DAY_COMPLETE||| 标记）的基线行为。
 * 这些测试在未修复代码上【预期全部通过】，修复后也必须继续通过（无回归）。
 *
 * Property 2: Preservation - 正常匹配路径行为不变
 * FOR ALL input WHERE NOT isBugCondition(input) DO
 *   ASSERT result.days.length === intent.days
 *   ASSERT result.estimatedCost > 0
 *   ASSERT result.tips.length > 0
 * END FOR
 *
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => {
  return { mockCreate: vi.fn() };
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

vi.mock('../config.js', () => ({
  config: {
    openaiApiKey: 'test-key',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4o-mini',
  },
}));

import { generateItinerary } from './openai.js';

// ---- 辅助函数 ----

/**
 * 构造含完整 |||DAY_COMPLETE||| 标记的流式输出（正常路径）。
 * NOT isBugCondition：notifiedDays 将非空，不触发兜底路径。
 *
 * @param {string} city - 目的地城市名
 * @param {number} days - 行程天数
 */
function makeNormalStream(city, days) {
  return async function* () {
    for (let i = 1; i <= days; i++) {
      const dayJson = JSON.stringify({
        day: i,
        theme: `${city}第${i}天主题`,
        activities: [
          {
            time: '09:00',
            name: `${city}景点${i}`,
            type: '景点',
            description: `游览${city}景点`,
            cost: 50,
          },
          {
            time: '12:00',
            name: `${city}餐厅${i}`,
            type: '餐饮',
            description: '午餐',
            cost: 80,
          },
        ],
        dailyCost: 300,
      });
      yield { choices: [{ delta: { content: `Day ${i}:\n${dayJson}\n|||DAY_COMPLETE|||\n` } }] };
    }
    // 汇总 JSON（tips 由单独 API 调用生成，这里只提供 estimatedCost 等）
    const summary = JSON.stringify({
      destination: city,
      totalDays: days,
      totalBudget: 5000,
      travelers: 1,
      estimatedCost: days * 300,
      summary: `${city}${days}天行程`,
      tips: [],
    });
    yield { choices: [{ delta: { content: summary + '\n' } }] };
  };
}

/**
 * 构造 tips 非流式 mock 响应
 */
function makeTipsResponse(city) {
  return {
    choices: [{
      message: {
        content: `["提前预订${city}热门景点门票","出发前查看天气","保留10%预算作应急备用金"]`,
      },
    }],
  };
}

// ---- 基线观察测试（上海3天行程）----

describe('Preservation: 上海3天行程正常路径基线行为', () => {
  const shanghaiIntent = {
    destination: '上海',
    budget: 5000,
    days: 3,
    travelers: 1,
    mustVisit: [],
    foodPrefs: [],
    origin: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate
      .mockImplementationOnce(() => makeNormalStream('上海', 3)())
      .mockResolvedValueOnce(makeTipsResponse('上海'));
  });

  /**
   * 验证 days.length === 3
   * Validates: Requirements 3.1, 3.2
   */
  it('should return days.length === 3 for Shanghai 3-day itinerary with complete markers', async () => {
    const onDayGenerated = vi.fn();

    const result = await generateItinerary(shanghaiIntent, [], null, onDayGenerated);

    expect(result.days.length).toBe(3);
  });

  /**
   * 验证 tips 数组非空
   * Validates: Requirements 3.3
   */
  it('should return non-empty tips array for normal path', async () => {
    const onDayGenerated = vi.fn();

    const result = await generateItinerary(shanghaiIntent, [], null, onDayGenerated);

    expect(Array.isArray(result.tips)).toBe(true);
    expect(result.tips.length).toBeGreaterThan(0);
  });

  /**
   * 验证 estimatedCost > 0
   * Validates: Requirements 3.1
   */
  it('should return estimatedCost > 0 for normal path', async () => {
    const onDayGenerated = vi.fn();

    const result = await generateItinerary(shanghaiIntent, [], null, onDayGenerated);

    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  /**
   * 验证 onDayGenerated 回调被调用3次
   * Validates: Requirements 3.2
   */
  it('should call onDayGenerated callback exactly 3 times for 3-day itinerary', async () => {
    const onDayGenerated = vi.fn();

    await generateItinerary(shanghaiIntent, [], null, onDayGenerated);

    expect(onDayGenerated).toHaveBeenCalledTimes(3);
  });

  /**
   * 验证 onDayGenerated 每次传入对应天数的 dayData
   * Validates: Requirements 3.2
   */
  it('should call onDayGenerated with correct dayData for each day', async () => {
    const onDayGenerated = vi.fn();

    await generateItinerary(shanghaiIntent, [], null, onDayGenerated);

    // 第1次调用：dayData.day === 1，dayIndex === 0
    expect(onDayGenerated.mock.calls[0][0].day).toBe(1);
    expect(onDayGenerated.mock.calls[0][1]).toBe(0);
    // 第2次调用：dayData.day === 2，dayIndex === 1
    expect(onDayGenerated.mock.calls[1][0].day).toBe(2);
    expect(onDayGenerated.mock.calls[1][1]).toBe(1);
    // 第3次调用：dayData.day === 3，dayIndex === 2
    expect(onDayGenerated.mock.calls[2][0].day).toBe(3);
    expect(onDayGenerated.mock.calls[2][1]).toBe(2);
  });
});

// ---- 参数化测试：不同天数（1-5天）、不同城市 ----

describe('Preservation: 参数化测试 - 不同天数和城市', () => {
  /**
   * 参数化测试用例：[城市, 天数]
   * 覆盖 1-5 天、多个城市，验证正常路径下 days.length === intent.days
   */
  const testCases = [
    ['上海', 1],
    ['成都', 2],
    ['杭州', 3],
    ['西安', 4],
    ['广州', 5],
  ];

  testCases.forEach(([city, days]) => {
    /**
     * 对不同天数（1-5天）、不同城市，当输出含完整标记时，
     * 验证 result.days.length === intent.days
     *
     * Validates: Requirements 3.1
     */
    it(`should return days.length === ${days} for ${city} ${days}-day itinerary with complete markers`, async () => {
      vi.clearAllMocks();
      mockCreate
        .mockImplementationOnce(() => makeNormalStream(city, days)())
        .mockResolvedValueOnce(makeTipsResponse(city));

      const intent = {
        destination: city,
        budget: 5000,
        days,
        travelers: 1,
        mustVisit: [],
        foodPrefs: [],
        origin: '',
      };
      const onDayGenerated = vi.fn();

      const result = await generateItinerary(intent, [], null, onDayGenerated);

      // 核心断言：days.length 必须等于 intent.days
      expect(result.days.length).toBe(days);
      // 附加断言：estimatedCost > 0
      expect(result.estimatedCost).toBeGreaterThan(0);
      // 附加断言：onDayGenerated 被调用正确次数
      expect(onDayGenerated).toHaveBeenCalledTimes(days);
    });
  });
});

// ---- 属性测试：NOT isBugCondition → 正确天数和费用 ----

describe('Preservation Property: NOT isBugCondition → result.days.length === intent.days', () => {
  /**
   * 属性测试：对多种城市和天数组合，当输出含完整 |||DAY_COMPLETE||| 标记时（NOT isBugCondition），
   * 验证 result.days.length === intent.days AND result.estimatedCost > 0
   *
   * 这是 Preservation Checking 的核心属性：
   * FOR ALL input WHERE NOT isBugCondition(input) DO
   *   ASSERT result.days.length === intent.days
   *   ASSERT result.estimatedCost > 0
   * END FOR
   *
   * Validates: Requirements 3.1, 3.2, 3.3
   */
  const cities = ['北京', '上海', '成都', '杭州', '西安', '广州', '深圳'];
  const dayOptions = [1, 2, 3, 4, 5];

  // 对所有城市×天数组合进行属性验证
  cities.forEach((city) => {
    dayOptions.forEach((days) => {
      it(`[Property] ${city} ${days}天 - 含完整标记时 days.length === ${days}`, async () => {
        vi.clearAllMocks();
        mockCreate
          .mockImplementationOnce(() => makeNormalStream(city, days)())
          .mockResolvedValueOnce(makeTipsResponse(city));

        const intent = {
          destination: city,
          budget: 3000 + days * 500,
          days,
          travelers: 1,
          mustVisit: [],
          foodPrefs: [],
          origin: '',
        };
        const onDayGenerated = vi.fn();

        const result = await generateItinerary(intent, [], null, onDayGenerated);

        // Property 2: Preservation
        expect(result.days.length).toBe(days);
        expect(result.estimatedCost).toBeGreaterThan(0);
        expect(Array.isArray(result.tips)).toBe(true);
        expect(result.tips.length).toBeGreaterThan(0);
      });
    });
  });
});
