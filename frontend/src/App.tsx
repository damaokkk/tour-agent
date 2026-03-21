import { useState, useEffect } from 'react';
import { SearchBox } from './components/SearchBox';
import { StreamViewer } from './components/StreamViewer';
import { ItineraryCard } from './components/ItineraryCard';
import { ModeSwitch, type AppMode } from './components/ModeSwitch';
import { GroupDecision } from './components/GroupDecision';
import { useEventSource } from './hooks/useEventSource';

// 调试日志面板组件
function DebugPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    const addLog = (type: string, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg).slice(0, 200) : String(arg)
      ).join(' ');
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev.slice(-20), `[${timestamp}] [${type}] ${message}`]);
    };

    console.log = (...args) => {
      addLog('LOG', ...args);
      originalLog.apply(console, args);
    };
    console.error = (...args) => {
      addLog('ERR', ...args);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-70 hover:opacity-100"
      >
        调试
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 z-50 bg-gray-900 text-green-400 text-xs rounded-lg p-3 max-h-60 overflow-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">调试日志</span>
        <button onClick={() => setLogs([])} className="text-gray-400 mr-2">清空</button>
        <button onClick={() => setIsOpen(false)} className="text-gray-400">关闭</button>
      </div>
      {logs.length === 0 ? (
        <div className="text-gray-500">暂无日志...</div>
      ) : (
        logs.map((log, i) => (
          <div key={i} className="break-all mb-1 font-mono">{log}</div>
        ))
      )}
    </div>
  );
}

// 智能行程规划模式
function TripPlanner() {
  const { events, isLoading, error, sendQuery, finalResult } = useEventSource();

  return (
    <>
      {/* 搜索区域 */}
      <SearchBox onSearch={sendQuery} isLoading={isLoading} />

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-medium">出错了</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 流式进度展示 */}
      {events.length > 0 && !finalResult && (
        <StreamViewer events={events} />
      )}

      {/* 行程结果 */}
      {finalResult && (
        <ItineraryCard itinerary={finalResult} />
      )}
    </>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>('planner');

  // 处理从多人决策返回的搜索
  const handleGroupDecisionSelect = (city: string) => {
    // 切换到规划模式并填入城市
    setMode('planner');
    // 这里可以通过 ref 或其他方式传递城市给 SearchBox
    // 暂时简化处理
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 md:py-12">
        {/* 标题区域 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            SmartTour
          </h1>
          <p className="text-lg text-gray-600">
            {mode === 'planner' ? '智能旅游规划助手，为您定制完美行程' : '多人出行决策助手，一起决定旅游目的地'}
          </p>
        </div>

        {/* 模式切换 */}
        <ModeSwitch currentMode={mode} onModeChange={setMode} />

        {/* 根据模式显示不同内容 */}
        {mode === 'planner' ? (
          <TripPlanner />
        ) : (
          <GroupDecision onSelectCity={handleGroupDecisionSelect} />
        )}

        {/* 底部信息 */}
        <div className="text-center mt-16 text-sm text-gray-400">
          <p>SmartTour Agent Demo · Powered by OpenAI & Tavily</p>
        </div>
      </div>
      
      {/* 调试面板 */}
      <DebugPanel />
    </div>
  );
}

export default App;
