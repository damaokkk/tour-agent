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
5. 只返回纯JSON，不要添加markdown代码块标记或其他说明文字。

示例：
- "从北京到上海玩3天" → origin:"北京", destination:"上海", travelers:1
- "两个人去成都旅游5天" → origin:"", destination:"成都", travelers:2
- "一家三口去杭州玩" → origin:"", destination:"杭州", travelers:3
- "预算5000去杭州玩" → origin:"", destination:"杭州", travelers:1`
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

最后输出汇总：
{"destination":"${destination}","totalDays":${days},"totalBudget":${budget},"travelers":${travelers},"estimatedCost":总费用,"summary":"摘要","days":[...],"tips":["建议 1"]}

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

  // 提取最终JSON
  const finalJsonMatch = fullContent.match(/\{[\s\S]*"destination"[\s\S]*"days"[\s\S]*\}/);
  if (finalJsonMatch) {
    try {
      return JSON.parse(finalJsonMatch[0]);
    } catch (e) {
      console.error('[Stream] Final parse error:', e.message);
    }
  }

  // 降级处理：从已生成的天数组装
  if (notifiedDays.size > 0) {
    const days = [];
    for (let i = 1; i <= intent.days; i++) {
      const dayPattern = new RegExp(`Day\\s+${i}:\\s*\\{[\\s\\S]*?\\}\\s*(?=Day|\\|\\|\\||$)`, 'g');
      const dayMatch = dayPattern.exec(fullContent);
      if (dayMatch) {
        const jsonMatch = dayMatch[0].match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            days.push(JSON.parse(jsonMatch[0]));
          } catch (e) {}
        }
      }
    }
    
    if (days.length > 0) {
      const estimatedCost = days.reduce((sum, d) => sum + (d.dailyCost || 0), 0);
      return {
        destination: intent.destination,
        totalDays: intent.days,
        totalBudget: intent.budget,
        estimatedCost,
        summary: `${intent.destination}${intent.days}天行程`,
        days,
        tips: ['建议提前预订']
      };
    }
  }

  return {
    destination: intent.destination,
    totalDays: intent.days,
    totalBudget: intent.budget,
    estimatedCost: 0,
    summary: `${intent.destination}${intent.days}天行程`,
    days: [],
    tips: ['请重试']
  };
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
