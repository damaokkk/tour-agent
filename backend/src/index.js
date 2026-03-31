import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config.js';
import tourRoutes from './routes/tour.js';
import { initGroupDecisionSocket } from './socket/groupDecision.js';
import { getChinaCities } from './services/baiduMap.js';
import { updateCities } from './data/cities.js';

// Build timestamp: 2026-03-21 - WebSocket Support
const app = express();
const httpServer = createServer(app);

const PRIVATE_IPV4_REGEX = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

function isPrivateIPv4(hostname) {
  return PRIVATE_IPV4_REGEX.test(hostname);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  try {
    const parsed = new URL(origin);
    if (config.corsAllowedOrigins.includes(origin)) return true;

    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;

    if (config.corsAllowPrivateNetwork && parsed.protocol === 'http:' && isPrivateIPv4(host)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin || 'unknown'}`));
  },
  credentials: true,
};

// Socket.io 配置
const io = new Server(httpServer, {
  cors: {
    ...corsOptions,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'], // 支持 WebSocket 和轮询降级
});

// 中间件
app.use(cors(corsOptions));
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
httpServer.listen(config.port, async () => {
  console.log(`🚀 SmartTour Backend running on http://localhost:${config.port}`);
  console.log(`📡 WebSocket namespace: /group-decision`);
  console.log(`📍 Environment: ${config.hasOpenAI ? '✅ OpenAI' : '❌ OpenAI'} | ${config.hasTavily ? '✅ Tavily' : '❌ Tavily (mock mode)'}`);
  
  // 尝试从百度地图获取城市数据
  if (config.hasBaiduMap) {
    console.log('🗺️  正在从百度地图获取城市数据...');
    const cities = await getChinaCities();
    if (cities) {
      updateCities(cities);
    } else {
      console.log('⚠️  使用默认城市数据');
    }
  } else {
    console.log('⚠️  未配置百度地图AK，使用默认城市数据');
  }
});
