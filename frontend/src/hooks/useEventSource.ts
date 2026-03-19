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
  // 微信浏览器使用非流式 API
  const defaultUrl = isWechatBrowser() 
    ? `${API_BASE_URL}/api/v1/tour/generate`
    : `${API_BASE_URL}/api/v1/tour/generate_stream`;
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

    // 微信浏览器使用非流式请求
    if (isWechatBrowser()) {
      // 模拟进度事件
      const mockEvents: StreamEvent[] = [
        { status: 'extracting', message: '正在分析您的需求...' },
        { status: 'searching', message: '正在搜索相关信息...' },
        { status: 'planning', message: '正在规划行程...' },
        { status: 'validating', message: '正在验证行程...' },
      ];
      
      let eventIndex = 0;
      const eventInterval = setInterval(() => {
        if (eventIndex < mockEvents.length) {
          setEvents((prev) => [...prev, mockEvents[eventIndex]]);
          eventIndex++;
        }
      }, 800);

      fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: abortController.signal,
      })
        .then(async (response) => {
          clearInterval(eventInterval);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.status === 'success' && data.result) {
            setEvents((prev) => [...prev, { status: 'success', message: '行程规划完成！', data }]);
            setFinalResult(data.result);
          } else {
            throw new Error(data.message || '请求失败');
          }
          setIsLoading(false);
        })
        .catch((err) => {
          clearInterval(eventInterval);
          if (err.name !== 'AbortError') {
            setError(err.message);
            setIsLoading(false);
          }
        });
      return;
    }

    // 非微信浏览器使用流式请求
    fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
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
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
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
