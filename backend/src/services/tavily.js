import { config } from '../config.js';

/**
 * Tavily 搜索服务
 * 使用 fetch 直接调用 API
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';

export async function search(query, signal = null) {
  if (!config.hasTavily) {
    return mockSearch(query);
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: config.tavilyApiKey,
        query: query,
        search_depth: 'basic',
        max_results: 3
      }),
      signal: signal || undefined
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      query,
      results: data.results || [],
      content: data.results?.map(r => r.content).join('\n\n') || ''
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    return mockSearch(query);
  }
}

/**
 * 模拟搜索（用于没有 API Key 时的演示）
 */
function mockSearch(query) {
  const mockData = {
    content: `关于 "${query}" 的搜索结果：\n\n这是一个模拟的搜索结果，用于演示。实际使用时请配置 TAVILY_API_KEY 获取真实数据。`,
    results: []
  };
  
  return mockData;
}
