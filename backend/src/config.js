import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  tavilyApiKey: process.env.TAVILY_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  
  get hasOpenAI() {
    return !!this.openaiApiKey;
  },
  
  get hasTavily() {
    return !!this.tavilyApiKey;
  }
};
