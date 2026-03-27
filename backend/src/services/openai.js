import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL: config.openaiBaseUrl
});

/**
 * 提取用户意图
 */
export async function extractIntent(query) {
  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      {
        role: 'system',
        content: `你是一个旅游需求解析助手。请从用户的描述中提取以下信息，以JSON格式返回，不要包含任何其他文字：
{
  "origin": "出发城市（如果用户提到从XX到XX，提取出发城市）",
  "destination": "目的地城市",
  "budget": 预算金额（数字，默认3000），
  "budgetType": "total 或 perPerson（判断用户说的是总预算还是人均预算）",
  "days": 天数（数字，默认3）,
  "travelers": 出行人数（数字，默认1）,
  "mustVisit": ["必去景点1", "必去景点2"],
  "foodPrefs": ["餐饮偏好1", "餐饮偏好2"],
  "notes": "其他备注"
}

重要规则：
1. 如果用户说"从XX到XX"或"从XX去XX"，前面的XX是出发地(origin)，后面的XX是目的地(destination)
2. 如果用户说"去XX玩"，XX就是目的地(destination)，出发地(origin)留空
3. 目的地(destination)必须是用户明确提到的旅游城市
4. 出行人数(travelers)：提取用户提到的"X个人"、"X人"、"X位"等，默认1人
5. budgetType判断规则：
   - 用户说"人均"、"每人"、"每个人"、"per person" → budgetType: "perPerson"
   - 其他情况（包括未说明）→ budgetType: "total"
6. 只返回纯JSON，不要添加markdown代码块标记或其他说明文字。

示例：
- "从北京到上海玩3天" → origin:"北京", destination:"上海", travelers:1, budgetType:"total"
- "两个人去成都旅游5天，预算5000" → origin:"", destination:"成都", travelers:2, budgetType:"total"
- "一家三口去杭州玩，人均1500" → origin:"", destination:"杭州", travelers:3, budget:1500, budgetType:"perPerson"
- "预算5000去杭州玩" → origin:"", destination:"杭州", travelers:1, budgetType:"total"`
      },
      { role: 'user', content: query }
    ],
    temperature: 0.1
  });

  const content = response.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const intent = JSON.parse(jsonMatch ? jsonMatch[0] : content);

  // 统一转换为总预算
  if (intent.budgetType === 'perPerson' && intent.travelers > 1) {
    intent.budget = intent.budget * intent.travelers;
  }
  intent.perPersonBudget = Math.round(intent.budget / (intent.travelers || 1));

  return intent;
}

/**
 * 生成搜索查询
 * 返回带类型的查询列表，用于前端展示搜索维度
 * B方案优化：减少查询数量，只保留最核心的1-2个查询
 */
export async function generateSearchQueries(intent) {
  const { destination, mustVisit = [], foodPrefs = [] } = intent;
  
  const queries = [];
  
  // 基础攻略查询（必须）
  queries.push({
    query: `${destination} 旅游攻略`,
    type: '攻略'
  });
  
  // 只保留第一个必去景点查询（如果有）
  if (mustVisit.length > 0) {
    queries.push({
      query: `${destination} ${mustVisit[0]} 攻略`,
      type: mustVisit[0]
    });
  }
  
  // 最多2个查询，减少搜索时间
  return queries.slice(0, 2);
}

/**
 * 生成行程规划（支持流式回调）
 * @param {Object} intent - 用户意图
 * @param {Array} searchResults - 搜索结果
 * @param {Object} transportInfo - 交通信息
 * @param {Function} onDayGenerated - 每生成一天的回调函数 (dayData, dayIndex) => void
 */
export async function generateItinerary(intent, searchResults, transportInfo = null, onDayGenerated = null) {
  const { destination, budget, days, travelers = 1, mustVisit = [], foodPrefs = [], origin } = intent;
  
  // 处理搜索结果（兼容新旧格式）
  const normalizedResults = searchResults.map(r => ({
    query: r.query?.query || r.query,
    content: r.content
  }));
  
  const searchContext = normalizedResults.map(r => 
    `搜索: ${r.query}\n结果: ${r.content.substring(0, 800)}`
  ).join('\n\n---\n\n');

  // 构建交通信息提示
  let transportPrompt = '';
  let transportRequirement = '';
  
  if (origin && origin !== destination) {
    // 用户明确指定了出发地
    transportPrompt = `
交通信息：
出发地: ${origin}
目的地: ${destination}
出行人数: ${travelers}人`;
    if (transportInfo) {
      transportPrompt += `
距离: ${transportInfo.distance}公里
建议交通方式: ${transportInfo.suggestedMode}
参考交通费用: ${transportInfo.roundTripCost}元（${travelers}人往返）`;
    }
    transportRequirement = `
5. 【重要】用户明确指定了从"${origin}"出发，必须在第一天安排从${origin}到${destination}的交通，并在最后一天安排返程交通
6. 往返大交通费用必须计入总预算，${travelers}人往返约${transportInfo?.roundTripCost || '待定'}元
7. 当地交通（地铁/公交/打车）费用需按${travelers}人计算，计入总预算`;
  } else {
    // 用户未指定出发地，只安排当地交通
    transportRequirement = `
5. 用户未指定出发地，只需安排目的地当地的交通（地铁/公交/打车/租车等），无需安排往返大交通
6. 当地交通费用计入总预算`;
  }

  // 如果有流式回调，使用流式生成
  if (onDayGenerated && typeof onDayGenerated === 'function') {
    return await generateItineraryStreaming(
      intent, 
      searchContext, 
      transportPrompt, 
      transportRequirement,
      onDayGenerated
    );
  }

  // 非流式生成（兼容原有调用）
  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的旅游规划师。请根据用户需求和搜索结果，生成详细的行程规划。

请以JSON格式返回，结构如下（只返回纯JSON，不要添加markdown代码块标记）：
{
  "destination": "目的地",
  "totalDays": 天数,
  "totalBudget": 总预算,
  "travelers": 出行人数,
  "estimatedCost": 预估总花费,
  "summary": "行程摘要",
  "days": [
    {
      "day": 1,
      "theme": "当日主题",
      "activities": [
        {
          "time": "09:00",
          "name": "活动名称",
          "type": "景点|餐饮|交通|住宿|购物|其他",
          "description": "活动描述",
          "cost": 费用数字,
          "location": "地点"
        }
      ],
      "dailyCost": 当日总费用
    }
  ],
  "tips": ["小贴士1", "小贴士2"]
}

重要：只返回纯JSON，不要添加markdown代码块标记或其他说明文字。`
      },
      {
        role: 'user',
        content: `请为以下需求生成行程规划：

目的地: ${destination}
预算: ${budget}元
天数: ${days}天
出行人数: ${travelers}人
必去景点: ${mustVisit.join(', ') || '无'}
餐饮偏好: ${foodPrefs.join(', ') || '无'}
${transportPrompt}

搜索结果参考:
${searchContext}

请确保：
1. 总花费不超过预算（按${travelers}人计算）
2. 包含所有必去景点
3. 时间安排合理
4. 费用明细清晰（每项费用标注是单人还是多人总价）
5. 餐饮推荐需适合${travelers}人用餐（如${travelers}人套餐或合适规模的餐厅）
${transportRequirement}`
      }
    ],
    temperature: 0.7
  });

  const content = response.choices[0].message.content;
  // 尝试提取JSON（去除可能的markdown代码块）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : content);
}

/**
 * 流式生成行程规划
 * A方案：实时流式输出chunk + B方案：简化prompt提高速度
 * 通过onChunk回调实时推送生成的文本内容
 */
async function generateItineraryStreaming(intent, searchContext, transportPrompt, transportRequirement, onDayGenerated, onChunk = null) {
  const { destination, budget, days, travelers = 1, mustVisit = [], foodPrefs = [], origin } = intent;

  // B方案优化：简化prompt，减少token数量，提高生成速度
  const stream = await openai.chat.completions.create({
    model: config.openaiModel,
    messages: [
      {
        role: 'system',
        content: `专业旅游规划师。生成${days}天${destination}行程，预算${budget}元。

格式：每天输出后标记"|||DAY_COMPLETE|||"
Day 1:
{"day":1,"theme":"主题","activities":[{"time":"09:00","name":"活动","type":"景点","description":"描述","cost":100}],"dailyCost":500}
|||DAY_COMPLETE|||

最后只需输出 tips 和汇总信息（days字段可省略）：
{"destination":"${destination}","totalDays":${days},"totalBudget":${budget},"travelers":${travelers},"estimatedCost":总费用数字,"summary":"一句话行程摘要","tips":["具体建议1","具体建议2","具体建议3"]}

规则：
1. 每天标记 |||DAY_COMPLETE|||
2. 总费用≤${budget}
3. 包含景点：${mustVisit.join(', ') || '无'}
${transportRequirement}`
      },
      {
        role: 'user',
        content: `规划${destination}${days}天行程，预算${budget}元。
参考：${searchContext.substring(0, 1500)}

逐天生成，每天标记完成。`
      }
    ],
    temperature: 0.7,
    stream: true
  });

  let fullContent = '';
  let notifiedDays = new Set();

  // 读取流式响应
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullContent += content;

    // A方案：实时推送chunk到前端（如果提供了回调）
    if (onChunk && content) {
      onChunk(content);
    }

    // 检测分隔标记，提取已完成的天
    const dayCompletePattern = /Day\s+(\d+):\s*\{[\s\S]*?\}\s*\|\|\|DAY_COMPLETE\|\|\|/g;
    let match;
    
    while ((match = dayCompletePattern.exec(fullContent)) !== null) {
      const dayJson = match[0];
      const dayNumber = parseInt(match[1]);
      
      if (!notifiedDays.has(dayNumber)) {
        try {
          const jsonMatch = dayJson.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const dayData = JSON.parse(jsonMatch[0]);
            onDayGenerated(dayData, dayNumber - 1);
            notifiedDays.add(dayNumber);
            console.log(`[Stream] Day ${dayNumber} generated`);
          }
        } catch (e) {
          console.error(`[Stream] Day ${dayNumber} parse error:`, e.message);
        }
      }
    }
  }

  // 优先从流式输出中提取 tips 和 summary（不依赖完整汇总JSON）
  let extractedTips = [];
  let extractedSummary = '';
  let extractedCost = 0;

  // 尝试提取 tips 数组
  const tipsMatch = fullContent.match(/"tips"\s*:\s*(\[[\s\S]*?\])/);
  if (tipsMatch) {
    try {
      extractedTips = JSON.parse(tipsMatch[1]);
    } catch (e) {}
  }

  // 尝试提取 summary
  const summaryMatch = fullContent.match(/"summary"\s*:\s*"([^"]+)"/);
  if (summaryMatch) extractedSummary = summaryMatch[1];

  // 尝试提取 estimatedCost
  const costMatch = fullContent.match(/"estimatedCost"\s*:\s*(\d+)/);
  if (costMatch) extractedCost = parseInt(costMatch[1]);

  // 用已逐天解析的数据组装最终结果
  if (notifiedDays.size > 0) {
    const collectedDays = [];
    for (let i = 1; i <= intent.days; i++) {
      const dayPattern = new RegExp(`Day\\s+${i}:\\s*(\\{[\\s\\S]*?\\})\\s*\\|\\|\\|DAY_COMPLETE\\|\\|\\|`);
      const dayMatch = fullContent.match(dayPattern);
      if (dayMatch) {
        try {
          collectedDays.push(JSON.parse(dayMatch[1]));
        } catch (e) {}
      }
    }

    const finalDays = collectedDays.length > 0 ? collectedDays : [];
    const estimatedCost = extractedCost || finalDays.reduce((sum, d) => sum + (d.dailyCost || 0), 0);

    if (finalDays.length > 0) {
      console.log(`[Tips] 开始生成 tips，行程天数: ${finalDays.length}`);
      // 单独调用 AI 生成高质量 tips
      const tips = await generateTips(intent, finalDays);
      console.log(`[Tips] 生成完成: ${tips.length} 条`);
      return {
        destination: intent.destination,
        totalDays: intent.days,
        totalBudget: intent.budget,
        travelers: intent.travelers || 1,
        estimatedCost,
        summary: extractedSummary || `${intent.destination}${intent.days}天行程`,
        days: finalDays,
        tips,
      };
    }
  }

  console.log(`[Tips] 走兜底路径，notifiedDays: ${notifiedDays.size}`);
  const fallbackTips = await generateTips(intent, []);
  return {
    destination: intent.destination,
    totalDays: intent.days,
    totalBudget: intent.budget,
    estimatedCost: 0,
    summary: `${intent.destination}${intent.days}天行程`,
    days: [],
    tips: fallbackTips,
  };
}

/**
 * 单独生成旅行小贴士
 */
async function generateTips(intent, days) {
  const { destination, budget, travelers = 1 } = intent;

  // 提取行程中涉及的景点和活动，作为上下文
  const highlights = days
    .flatMap(d => d.activities || [])
    .filter(a => a.type === '景点' || a.type === '餐饮')
    .slice(0, 6)
    .map(a => a.name)
    .join('、');

  try {
    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        {
          role: 'system',
          content: `你是一个旅游顾问，根据行程内容给出实用的旅行小贴士。
只返回JSON数组，格式：["贴士1", "贴士2", "贴士3", "贴士4", "贴士5"]
要求：
- 3~5条，每条15~30字
- 针对具体目的地和行程内容，不要泛泛而谈
- 包含实用信息：预订建议、注意事项、省钱技巧、当地习俗等
- 不要带序号或符号前缀
- 只返回纯JSON数组，不要其他文字`
        },
        {
          role: 'user',
          content: `目的地：${destination}，${days.length}天，${travelers}人，预算${budget}元。
主要行程：${highlights || destination + '周边景点'}`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content.trim();
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      const tips = JSON.parse(match[0]);
      if (Array.isArray(tips) && tips.length > 0) return tips;
    }
  } catch (e) {
    console.error('[Tips] 生成失败:', e.message);
  }

  // 兜底
  return [
    `提前在网上预订${destination}热门景点门票，避免现场排队`,
    '出发前查看目的地近期天气，合理安排行程',
    '保留总预算10%作为应急备用金',
  ];
}

/**
 * 验证并修复行程（同步执行，无需等待）
 */
export function validateAndFix(itinerary, intent) {
  const errors = [];
  
  // 检查预算
  if (itinerary.estimatedCost > intent.budget) {
    errors.push(`预估费用 ${itinerary.estimatedCost} 超出预算 ${intent.budget}`);
  }
  
  // 检查必去景点
  const allActivities = itinerary.days.flatMap(d => d.activities.map(a => a.name));
  for (const spot of intent.mustVisit || []) {
    const found = allActivities.some(a => a.includes(spot) || spot.includes(a));
    if (!found) {
      errors.push(`未包含必去景点: ${spot}`);
    }
  }
  
  return errors;
}
