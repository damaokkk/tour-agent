import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'https://tour-agent-seven.vercel.app',
  'https://www.tour-plan.cn',
  'https://tour-plan.cn',
];

const parseCsv = (value = '') => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const config = {
  port: process.env.PORT || 8000,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  baiduMapAk: process.env.BAIDU_MAP_AK || '',
  aliyunAppCode: process.env.ALIYUN_APPCODE || '', // 阿里云市场AppCode
  corsAllowedOrigins: parseCsv(process.env.CORS_ALLOWED_ORIGINS || '').length > 0
    ? parseCsv(process.env.CORS_ALLOWED_ORIGINS)
    : DEFAULT_CORS_ALLOWED_ORIGINS,
  corsAllowPrivateNetwork: process.env.CORS_ALLOW_PRIVATE_NETWORK === 'true' || process.env.NODE_ENV !== 'production',

  get hasOpenAI() {
    return !!this.openaiApiKey;
  },

  get hasTavily() {
    return !!this.tavilyApiKey;
  },

  get hasBaiduMap() {
    return !!this.baiduMapAk;
  },

  get hasAliyunTrain() {
    return !!this.aliyunAppCode;
  }
};
