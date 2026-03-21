import { useState, useCallback, useRef, useEffect } from 'react';

export interface StreamEvent {
  status: 'extracting' | 'searching' | 'planning' | 'validating' | 'success' | 'error';
  message: string;
  data?: any;
}

// 检测是否为微信浏览器
const isWechatBrowser = () => {
  return /MicroMessenger/i.test(navigator.userAgent);
};

interface UseEventSourceReturn {
  events: StreamEvent[];
  isLoading: boolean;   
  error: string | null;
  sendQuery: (query: string) => void;
  reset: () => void;
  finalResult: any | null;
}

// 生产环境后端地址
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://tour-agent-production.up.railway.app'
  : '';

export function useEventSource(apiUrl?: string): UseEventSourceReturn {
  // 微信浏览器使用非流式 API（暂时注释掉，测试流式输出）
  // const defaultUrl = isWechatBrowser() 
  //   ? `${API_BASE_URL}/api/v1/tour/generate`
  //   : `${API_BASE_URL}/api/v1/tour/generate_stream`;
  const defaultUrl = `${API_BASE_URL}/api/v1/tour/generate_stream`;
  const finalUrl = apiUrl || defaultUrl;
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setIsLoading(false);
    setError(null);
    setFinalResult(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendQuery = useCallback((query: string) => {
    reset();
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 微信浏览器使用非流式请求（暂时注释掉，测试流式输出）
    // if (isWechatBrowser()) {
    //   // 模拟进度事件
    //   const mockEvents: StreamEvent[] = [
    //     { status: 'extracting', message: '正在分析您的需求...' },
    //     { status: 'searching', message: '正在搜索相关信息...' },
    //     { status: 'planning', message: '正在规划行程...' },
    //     { status: 'validating', message: '正在验证行程...' },
    //   ];
    //   
    //   let eventIndex = 0;
    //   const eventInterval = setInterval(() => {
    //     if (eventIndex < mockEvents.length) {
    //       setEvents((prev) => [...prev, mockEvents[eventIndex]]);
    //       eventIndex++;
    //     }
    //   }, 800);

    //   fetch(finalUrl, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ query }),
    //     signal: abortController.signal,
    //   })
    //     .then(async (response) => {
    //       clearInterval(eventInterval);
    //       if (!response.ok) {
    //         throw new Error(`HTTP error! status: ${response.status}`);
    //       }
    //       const data = await response.json();
    //       if (data.status === 'success' && data.result) {
    //         setEvents((prev) => [...prev, { status: 'success', message: '行程规划完成！', data }]);
    //         setFinalResult(data.result);
    //       } else {
    //         throw new Error(data.message || '请求失败');
    //       }
    //       setIsLoading(false);
    //     })
    //     .catch((err) => {
    //       clearInterval(eventInterval);
    //       if (err.name !== 'AbortError') {
    //         setError(err.message);
    //         setIsLoading(false);
    //       }
    //     });
    //   return;
    // }

    // 所有浏览器都使用流式请求（测试阶段）
    console.log('[Debug] 开始请求:', finalUrl);
    console.log('[Debug] User-Agent:', navigator.userAgent);
    console.log('[Debug] 是否微信:', isWechatBrowser());
    
    fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        console.log('[Debug] 收到响应:', response.status, response.headers.get('content-type'));
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        console.log('[Debug] reader:', reader ? '存在' : '不存在');
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';
        let chunkCount = 0;

        try {
          while (true) {
            console.log('[Debug] 等待读取 chunk...');
            const { done, value } = await reader.read();
            
            console.log('[Debug] 读取结果:', { done, valueLength: value?.length });
            
            if (done) {
              console.log('[Debug] 读取完成');
              break;
            }

            chunkCount++;
            buffer += decoder.decode(value, { stream: true });
            console.log('[Debug] 当前 buffer:', buffer.substring(0, 200));
            
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                console.log('[Debug] 收到 data:', data.substring(0, 100));
                
                if (data === '[DONE]') {
                  setIsLoading(false);
                  return;
                }

                try {
                  const event: StreamEvent = JSON.parse(data);
                  setEvents((prev) => [...prev, event]);

                  if (event.status === 'success' && event.data?.result) {
                    setFinalResult(event.data.result);
                  }

                  if (event.status === 'error') {
                    setError(event.message);
                    setIsLoading(false);
                  }
                } catch (e) {
                  console.error('Failed to parse event:', data);
                }
              }
            }
          }
        } catch (readErr) {
          console.error('[Debug] 读取流时出错:', readErr);
          throw readErr;
        }
      })
      .catch((err) => {
        console.error('[Debug] 请求错误:', err);
        if (err.name !== 'AbortError') {
          setError(err.message || '请求失败，请稍后重试');
          setIsLoading(false);
        }
      });
  }, [finalUrl, reset]);

  return {
    events,
    isLoading,
    error,
    sendQuery,
    reset,
    finalResult,
  };
}
