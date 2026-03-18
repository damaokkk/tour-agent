import { Router } from 'express';
import { WorkflowEngine } from '../workflow/engine.js';

const router = Router();

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
    
    sendEvent({
      status: 'error',
      message: `服务错误: ${error.message}`,
      data: { error: error.message }
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

export default router;
