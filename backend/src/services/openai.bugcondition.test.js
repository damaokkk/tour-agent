/**
 * Bug Condition Exploration Test
 *
 * 目标：在未修复代码上确认 bug 存在。
 * 测试断言的是【期望行为】（days.length === 5），
 * 在未修复代码上此测试【预期失败】，失败本身证明 bug 存在。
 *
 * Bug 根因：
 * 1. generateItinerary 函数签名只接受4个参数，第5个 onChunk 被静默忽略
 * 2. 当 AI 输出不含 |||DAY_COMPLETE||| 标记时，notifiedDays 为空，
 *    系统走兜底路径返回 days: []，丢弃所有已生成内容
 *
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted 确保 mockCreate 在 vi.mock 工厂被 hoist 前已初始化
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
 * 构造不含 |||DAY_COMPLETE||| 标记的北京5天行程流式输出。
 * 这是触发 Bug_Condition 的关键输入：fullContent 非空但 notifiedDays 为空。
 */
async function* makeBugConditionStream() {
  const chunks = [
    'Day 1:\n{"day":1,"theme":"故宫与天安门","activities":[{"time":"09:00","name":"天安门广场","type":"景点","description":"参观天安门","cost":0},{"time":"10:30","name":"故宫博物院","type":"景点","description":"游览故宫","cost":60}],"dailyCost":300}\n',
    'Day 2:\n{"day":2,"theme":"长城一日游","activities":[{"time":"08:00","name":"八达岭长城","type":"景点","description":"登长城","cost":40}],"dailyCost":400}\n',
    'Day 3:\n{"day":3,"theme":"颐和园与圆明园","activities":[{"time":"09:00","name":"颐和园","type":"景点","description":"游览颐和园","cost":30}],"dailyCost":350}\n',
    'Day 4:\n{"day":4,"theme":"胡同文化","activities":[{"time":"10:00","name":"南锣鼓巷","type":"景点","description":"胡同漫步","cost":0}],"dailyCost":250}\n',
    'Day 5:\n{"day":5,"theme":"购物与返程","activities":[{"time":"10:00","name":"王府井","type":"购物","description":"购物","cost":200}],"dailyCost":500}\n',
    '{"destination":"北京","totalDays":5,"totalBudget":8000,"travelers":1,"estimatedCost":1800,"summary":"北京5天文化之旅","tips":["提前预订故宫门票","长城建议早去"]}\n',
  ];
  for (const text of chunks) {
    yield { choices: [{ delta: { content: text } }] };
  }
}

/** tips 生成的非流式 mock 响应 */
const tipsResponse = {
  choices: [{
    message: {
      content: '["提前预订故宫门票，避免排队","长城建议早去人少","北京地铁方便，推荐购买一日票"]',
    },
  }],
};

/** 标准北京5天行程 intent */
const beijingIntent = {
  destination: '北京',
  budget: 8000,
  days: 5,
  travelers: 1,
  mustVisit: ['故宫', '长城'],
  foodPrefs: [],
  origin: '',
};

// ---- 测试 ----

describe('Bug Condition Exploration: generateItinerary without |||DAY_COMPLETE||| markers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 第一次调用：流式行程生成；第二次调用：tips 生成（非流式）
    mockCreate
      .mockResolvedValueOnce(makeBugConditionStream())
      .mockResolvedValueOnce(tipsResponse);
  });

  /**
   * 核心 Bug Condition 测试
   *
   * 当 AI 输出包含完整的 Day 1~5 JSON 但【不含】 |||DAY_COMPLETE||| 标记时，
   * 未修复代码的 notifiedDays 为空，走兜底路径返回 days: []。
   *
   * 此测试断言【期望行为】：days.length === 5
   * 在未修复代码上，此断言【预期失败】，证明 bug 存在。
   *
   * Validates: Requirements 1.1, 1.2
   */
  it('should return days.length === 5 when fullContent has complete itinerary but no |||DAY_COMPLETE||| markers', async () => {
    const onDayGenerated = vi.fn();

    const result = await generateItinerary(beijingIntent, [], null, onDayGenerated);

    // 期望行为：应返回5天行程（修复后通过，未修复时失败 → 证明 bug 存在）
    expect(result.days.length).toBe(5);
    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  /**
   * estimatedCost 验证
   *
   * 未修复代码走兜底路径时 estimatedCost === 0。
   * 此测试断言期望行为：estimatedCost > 0。
   *
   * Validates: Requirements 1.1
   */
  it('should return estimatedCost > 0 when fullContent has complete itinerary but no markers', async () => {
    const onDayGenerated = vi.fn();

    const result = await generateItinerary(beijingIntent, [], null, onDayGenerated);

    // 期望行为：estimatedCost 应大于0（未修复时为0 → 证明 bug 存在）
    expect(result.estimatedCost).toBeGreaterThan(0);
  });

  /**
   * onChunk 回调透传验证
   *
   * 未修复代码中 generateItinerary 只接受4个参数，第5个 onChunk 被静默忽略，
   * 导致 onChunk 从未被调用。
   * 此测试断言期望行为：onChunk 应被调用至少一次。
   *
   * Validates: Requirements 1.3
   */
  it('should call onChunk callback at least once when streaming content is received', async () => {
    const onDayGenerated = vi.fn();
    const onChunk = vi.fn(); // 第5个参数，未修复代码会忽略它

    // 传入第5个参数 onChunk
    await generateItinerary(beijingIntent, [], null, onDayGenerated, onChunk);

    // 期望行为：onChunk 应被调用（未修复时调用次数为0 → 证明 bug 存在）
    expect(onChunk).toHaveBeenCalled();
  });
});
