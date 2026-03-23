import { useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  status: 'extracting' | 'searching' | 'planning' | 'planning_progress' | 'planning_complete' | 'planning_stream' | 'validating' | 'success' | 'error';
  message: string;
  data?: any;
}

export interface DayProgress {
  day: any;
  dayIndex: number;
  completedDays: number;
  totalDays: number;
  progress: number;
}

interface UseEventSourceReturn {
  events: StreamEvent[];
  isLoading: boolean;   
  error: string | null;
  sendQuery: (query: string) => void;
  reset: () => void;
  finalResult: any | null;
  dayProgressList: DayProgress[];
  streamContent: string;
}

// 生产环境后端地址
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://tour-agent-production.up.railway.app'
  : '';

export function useEventSource(apiUrl?: string): UseEventSourceReturn {
  const defaultUrl = `${API_BASE_URL}/api/v1/tour/generate_stream`;
  const finalUrl = apiUrl || defaultUrl;
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [dayProgressList, setDayProgressList] = useState<DayProgress[]>([]);
  const [streamContent, setStreamContent] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setIsLoading(false);
    setError(null);
    setFinalResult(null);
    setDayProgressList([]);
    setStreamContent('');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendQuery = useCallback((query: string) => {
    reset();
    setIsLoading(true);

    // 立即显示初始进度状态，无需等待后端第一个事件
    const initialEvent: StreamEvent = {
      status: 'extracting',
      message: '正在解析您的行程需求...',
      data: { query }
    };
    setEvents([initialEvent]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 流式请求，添加120秒超时
    const TIMEOUT_MS = 120000;
    const timeoutId = setTimeout(() => {
      abortController.abort();
      setError('请求超时，请稍后重试');
      setIsLoading(false);
    }, TIMEOUT_MS);

    fetch(finalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
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

                // 处理逐日规划进度事件
                if (event.status === 'planning_progress' && event.data) {
                  const dayProgress: DayProgress = {
                    day: event.data.day,
                    dayIndex: event.data.dayIndex,
                    completedDays: event.data.completedDays,
                    totalDays: event.data.totalDays,
                    progress: event.data.progress
                  };
                  setDayProgressList(prev => {
                    // 避免重复添加同一天
                    const filtered = prev.filter(d => d.day.day !== dayProgress.day.day);
                    return [...filtered, dayProgress];
                  });
                }

                // 处理流式chunk事件
                if (event.status === 'planning_stream' && event.data?.chunk) {
                  setStreamContent(prev => prev + event.data.chunk);
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
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          setError('请求超时，请稍后重试');
        } else {
          setError(err.message);
        }
        setIsLoading(false);
      });
  }, [finalUrl, reset]);

  return {
    events,
    isLoading,
    error,
    sendQuery,
    reset,
    finalResult,
    dayProgressList,
    streamContent,
  };
}
