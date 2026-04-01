import { Router } from 'express';
import { WorkflowEngine } from '../workflow/engine.js';
import { extractIntent } from '../services/openai.js';
import { calculateTransportCost } from '../services/transportCalculator.js';
import { CITIES, searchCities as searchLocalCities } from '../data/cities.js';
import { searchCities as searchBaiduCities, getCityDetail } from '../services/baiduMap.js';
import { config } from '../config.js';
import { APIUserAbortError } from 'openai';

const router = Router();

/**
 * POST /api/v1/tour/preview
 * 预览方案概要接口（规划前展示）
 */
router.post('/preview', async (req, res) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter' });
  }

  try {
    // 提取意图
    const intent = await extractIntent(query);
    
    // 计算交通费用
    let transportInfo = null;
    if (intent.origin && intent.origin !== intent.destination) {
      transportInfo = await calculateTransportCost(
        intent.origin, 
        intent.destination, 
        intent.travelers || 1
      );
    }
    
    // 计算预算分析
    const travelers = intent.travelers || 1;
    const transportCost = transportInfo?.roundTripCost || 0;
    const remainingBudget = intent.budget - transportCost;
    const dailyBudget = remainingBudget / intent.days;
    const perPersonDailyBudget = dailyBudget / travelers;
    
    // 预算评估
    let budgetAssessment = '合理';
    let budgetTips = [];
    
    if (perPersonDailyBudget < 150) {
      budgetAssessment = '紧张';
      budgetTips = [
        '建议选择经济型住宿（如青旅、快捷酒店）',
        '以当地小吃和快餐为主',
        '优先选择免费或低价景点'
      ];
    } else if (perPersonDailyBudget < 300) {
      budgetAssessment = '适中';
      budgetTips = [
        '可选择舒适型住宿',
        '适当安排特色餐厅',
        '平衡免费景点和收费景点'
      ];
    } else {
      budgetAssessment = '充裕';
      budgetTips = [
        '可选择高档住宿',
        '品尝当地特色美食',
        '体验更多付费项目'
      ];
    }
    
    res.json({
      status: 'success',
      preview: {
        intent: {
          origin: intent.origin,
          destination: intent.destination,
          days: intent.days,
          travelers: travelers,
          budget: intent.budget,
          mustVisit: intent.mustVisit || [],
          foodPrefs: intent.foodPrefs || []
        },
        transport: transportInfo ? {
          origin: intent.origin,
          destination: intent.destination,
          distance: transportInfo.distance,
          suggestedMode: transportInfo.suggestedMode,
          travelers: travelers,
          roundTripCost: transportInfo.roundTripCost,
          perPersonCost: transportInfo.roundTripCostPerPerson || Math.round(transportInfo.roundTripCost / travelers)
        } : null,
        budgetAnalysis: {
          totalBudget: intent.budget,
          transportCost: transportCost,
          remainingBudget: remainingBudget,
          dailyBudget: Math.round(dailyBudget),
          perPersonDailyBudget: Math.round(perPersonDailyBudget),
          assessment: budgetAssessment,
          tips: budgetTips
        }
      }
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      status: 'error',
      message: `分析失败: ${error.message}`
    });
  }
});

/**
 * POST /api/v1/tour/generate
 * 非流式行程生成接口（用于微信等不支持流式的浏览器）
 */
router.post('/generate', async (req, res) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter' });
  }

  const events = [];
  
  // 收集所有事件的辅助函数
  const collectEvent = async (data) => {
    events.push(data);
  };

  try {
    const engine = new WorkflowEngine(collectEvent);
    await engine.run(query);
    
    // 返回最终结果
    const finalEvent = events.find(e => e.status === 'success');
    res.json({
      status: 'success',
      result: finalEvent?.data?.result || null,
      events: events
    });
    
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({
      status: 'error',
      message: `服务错误: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/tour/generate_stream
 * SSE 流式行程生成接口
 */
router.post('/generate_stream', async (req, res) => {
  const { query } = req.body;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter' });
  }

  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 用于中断工作流的 AbortController
  const abortController = new AbortController();

  // 监听客户端真正断开（socket destroy），而不是 req close（Vite 代理会触发假的 close）
  req.socket.on('close', () => {
    if (res.writableEnded) return;
    console.log('[SSE] socket closed, aborting workflow');
    abortController.abort();
  });

  // 发送事件的辅助函数（连接已断开时静默忽略）
  const sendEvent = async (data) => {
    if (abortController.signal.aborted) {
      console.log('[SSE] sendEvent skipped, aborted');
      return;
    }
    console.log('[SSE] sending event:', data.status, data.message?.substring(0, 30));
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (res.flush) res.flush();
  };

  try {
    const engine = new WorkflowEngine(sendEvent, abortController.signal);
    await engine.run(query);
    
    // 发送结束标记
    res.write(`data: [DONE]\n\n`);
    res.end();
    
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'APIUserAbortError' || error instanceof APIUserAbortError || abortController.signal.aborted) {
      // 前端主动断开，静默结束
      res.end();
      return;
    }
    console.error('Stream error:', error);
    console.error('Stack trace:', error.stack);
    
    sendEvent({
      status: 'error',
      message: `服务错误: ${error.message}`,
      data: { error: error.message, stack: error.stack }
    });
    
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

/**
 * GET /api/v1/tour/health
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/v1/tour/cities
 * 获取所有城市列表
 */
router.get('/cities', (req, res) => {
  res.json({
    count: CITIES.length,
    cities: CITIES,
  });
});

/**
 * GET /api/v1/tour/cities/search?q=关键词
 * 搜索城市
 */
router.get('/cities/search', async (req, res) => {
  const { q } = req.query;
  
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    // 先搜索本地数据
    const localResults = searchLocalCities(q);
    
    // 如果有百度地图AK，也搜索百度地图
    let baiduResults = [];
    if (config.hasBaiduMap) {
      baiduResults = await searchBaiduCities(q);
    }

    // 合并结果，去重
    const allResults = [...localResults];
    for (const baiduCity of baiduResults) {
      const exists = allResults.some(c => c.name === baiduCity.name);
      if (!exists && baiduCity.lat && baiduCity.lng) {
        allResults.push({
          name: baiduCity.name,
          province: baiduCity.province || baiduCity.city,
          lat: baiduCity.lat,
          lng: baiduCity.lng,
        });
      }
    }

    res.json({
      query: q,
      count: allResults.length,
      cities: allResults.slice(0, 10), // 最多返回10个
    });
  } catch (error) {
    console.error('Search cities error:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

/**
 * GET /api/v1/tour/cities/:name
 * 获取城市详情
 */
router.get('/cities/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    // 先查本地
    const localCity = CITIES.find(c => c.name === name);
    
    if (localCity) {
      return res.json({ city: localCity });
    }

    // 再查百度地图
    if (config.hasBaiduMap) {
      const baiduCity = await getCityDetail(name);
      if (baiduCity) {
        return res.json({
          city: {
            name: baiduCity.name,
            province: baiduCity.province,
            lat: baiduCity.lat,
            lng: baiduCity.lng,
          },
          source: 'baidu',
        });
      }
    }

    res.status(404).json({ error: '城市未找到' });
  } catch (error) {
    console.error('Get city error:', error);
    res.status(500).json({ error: '获取城市信息失败' });
  }
});

export default router;
