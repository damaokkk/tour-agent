import { useState, useCallback, useRef } from 'react';

export interface StreamEvent {
  status: 'extracting' | 'searching' | 'planning' | 'planning_progress' | 'planning_complete' | 'planning_stream' | 'validating' | 'success' | 'error' | 'aborted';
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
  abort: () => void;
  currentQuery: string;
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
  const dayProgressRef = useRef<DayProgress[]>([]);
  const [streamContent, setStreamContent] = useState<string>('');
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAbortedRef = useRef(false);

  const reset = useCallback(() => {
    setEvents([]);
    setIsLoading(false);
    setError(null);
    setFinalResult(null);
    setDayProgressList([]);
    dayProgressRef.current = [];
    setStreamContent('');
    isAbortedRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    isAbortedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // 不清空 events，而是追加一个终止状态，让用户看到已终止的提示
    setEvents(prev => prev.length > 0 ? [...prev, { status: 'aborted', message: '已停止规划' }] : []);
    setIsLoading(false);
    setStreamContent('');
    setDayProgressList([]);
    // currentQuery 保留，用于回填输入框
  }, []);

  const sendQuery = useCallback((query: string) => {
    reset();
    isAbortedRef.current = false;
    setIsLoading(true);
    setCurrentQuery(query);

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
                if (!isAbortedRef.current) setIsLoading(false);
                return;
              }

              try {
                const event: StreamEvent = JSON.parse(data);
                // 如果已被终止，忽略后续事件
                if (isAbortedRef.current) return;
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
                    // 避免重复添加同一天，兼容 day 字段为数字或对象两种情况
                    const getDayNum = (d: DayProgress) =>
                      typeof d.day === 'object' ? d.day.day : d.day;
                    const newDayNum = typeof dayProgress.day === 'object' ? dayProgress.day.day : dayProgress.day;
                    const filtered = prev.filter(d => getDayNum(d) !== newDayNum);
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
          // 用户主动终止，不显示错误，isLoading 已在 abort() 里设为 false
        } else {
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
    abort,
    currentQuery,
    finalResult,
    dayProgressList,
    streamContent,
  };
}
