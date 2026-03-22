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
  "budget": 预算金额（数字，默认3000）,
  "days": 天数（数字，默认3）,
  "mustVisit": ["必去景点1", "必去景点2"],
  "foodPrefs": ["餐饮偏好1", "餐饮偏好2"],
  "notes": "其他备注"
}

重要规则：
1. 如果用户说"从XX到XX"或"从XX去XX"，前面的XX是出发地(origin)，后面的XX是目的地(destination)
2. 如果用户说"去XX玩"，XX就是目的地(destination)，出发地(origin)留空
3. 目的地(destination)必须是用户明确提到的旅游城市
4. 只返回纯JSON，不要添加markdown代码块标记或其他说明文字。

示例：
- "从北京到上海玩3天" → origin:"北京", destination:"上海"
- "去成都旅游5天" → origin:"", destination:"成都"
- "预算5000去杭州玩" → origin:"", destination:"杭州"`
      },
      { role: 'user', content: query }
    ],
    temperature: 0.1
  });

  const content = response.choices[0].message.content;
  // 尝试提取JSON（去除可能的markdown代码块）
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : content);
}

/**
 * 生成搜索查询
 */
export async function generateSearchQueries(intent) {
  const { destination, mustVisit = [], foodPrefs = [] } = intent;
  
  const queries = [];
  
  // 基础攻略查询
  queries.push(`${destination} 旅游攻略 2024`);
  
  // 必去景点查询
  for (const spot of mustVisit.slice(0, 2)) {
    queries.push(`${destination} ${spot} 攻略 门票`);
  }
  
  // 餐饮查询
  if (foodPrefs.length > 0) {
    queries.push(`${destination} ${foodPrefs[0]} 推荐`);
  }
  
  return queries.slice(0, 4);
}

/**
 * 生成行程规划
 */
export async function generateItinerary(intent, searchResults, transportInfo = null) {
  const { destination, budget, days, mustVisit = [], foodPrefs = [], origin } = intent;
  
  const searchContext = searchResults.map(r => 
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
目的地: ${destination}`;
    if (transportInfo) {
      transportPrompt += `
距离: ${transportInfo.distance}公里
建议交通方式: ${transportInfo.suggestedMode}
参考交通费用: ${transportInfo.estimatedCost}元（单程）`;
    }
    transportRequirement = `
5. 【重要】用户明确指定了从"${origin}"出发，必须在第一天安排从${origin}到${destination}的交通，并在最后一天安排返程交通
6. 往返大交通费用必须计入总预算，参考价格：高铁约0.4-0.5元/公里，飞机按航线定价（800公里内约500-800元，800-1500公里约800-1500元，1500公里以上约1200-2500元）
7. 当地交通（地铁/公交/打车）费用也需计入预算`;
  } else {
    // 用户未指定出发地，只安排当地交通
    transportRequirement = `
5. 用户未指定出发地，只需安排目的地当地的交通（地铁/公交/打车/租车等），无需安排往返大交通
6. 当地交通费用计入总预算`;
  }

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
必去景点: ${mustVisit.join(', ') || '无'}
餐饮偏好: ${foodPrefs.join(', ') || '无'}
${transportPrompt}

搜索结果参考:
${searchContext}

请确保：
1. 总花费不超过预算
2. 包含所有必去景点
3. 时间安排合理
4. 费用明细清晰
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
 * 验证并修复行程
 */
export async function validateAndFix(itinerary, intent) {
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
