import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config.js';
import tourRoutes from './routes/tour.js';
import { initGroupDecisionSocket } from './socket/groupDecision.js';

// Build timestamp: 2026-03-21 - WebSocket Support
const app = express();
const httpServer = createServer(app);

// Socket.io 配置
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:5174', 
      'http://localhost:5175', 
      'http://localhost:3000',
      'https://tour-agent-seven.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // 支持 WebSocket 和轮询降级
});

// 中间件
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://localhost:3000',
    'https://tour-agent-seven.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// 路由
app.use('/api/v1/tour', tourRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'SmartTour Agent API',
    version: '1.0.0',
    endpoints: [
      'POST /api/v1/tour/generate',
      'POST /api/v1/tour/generate_stream',
      'GET /api/v1/tour/health'
    ],
    websocket: '/group-decision'
  });
});

// 初始化 WebSocket
initGroupDecisionSocket(io);

// 启动服务器
httpServer.listen(config.port, () => {
  console.log(`🚀 SmartTour Backend running on http://localhost:${config.port}`);
  console.log(`📡 WebSocket namespace: /group-decision`);
  console.log(`📍 Environment: ${config.hasOpenAI ? '✅ OpenAI' : '❌ OpenAI'} | ${config.hasTavily ? '✅ Tavily' : '❌ Tavily (mock mode)'}`);
});
