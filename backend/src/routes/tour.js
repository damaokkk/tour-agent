import { Router } from 'express';
import { WorkflowEngine } from '../workflow/engine.js';
import { CITIES, searchCities as searchLocalCities } from '../data/cities.js';
import { searchCities as searchBaiduCities, getCityDetail } from '../services/baiduMap.js';
import { config } from '../config.js';

const router = Router();

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

  // 发送事件的辅助函数
  const sendEvent = async (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    // 立即刷新
    if (res.flush) res.flush();
  };

  try {
    const engine = new WorkflowEngine(sendEvent);
    await engine.run(query);
    
    // 发送结束标记
    res.write(`data: [DONE]\n\n`);
    res.end();
    
  } catch (error) {
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
