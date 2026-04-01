import { useEffect, useState } from 'react';
import { SearchBox } from './components/SearchBox';
import { StreamViewer } from './components/StreamViewer';
import { ItineraryCard } from './components/ItineraryCard';
import { MidpointCalculator } from './components/MidpointCalculator';
import { RandomDraw } from './components/RandomDraw';
import { useEventSource } from './hooks/useEventSource';

export type AppMode = 'planner' | 'midpoint' | 'draw';

interface RoomInfo {
  roomId: string;
  isConnected: boolean;
  isHost: boolean;
}

interface TripPlannerProps {
  autoQuery: string;
  autoQueryVersion: number;
}

function TripPlanner({ autoQuery, autoQueryVersion }: TripPlannerProps) {
  const { events, isLoading, error, sendQuery, abort, currentQuery, finalResult, dayProgressList, streamContent } = useEventSource();
  const [abortedQuery, setAbortedQuery] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (autoQuery.trim()) {
      setAbortedQuery(autoQuery);
      sendQuery(autoQuery);
    }
  }, [autoQuery, autoQueryVersion, sendQuery]);

  useEffect(() => {
    if (finalResult) {
      setShowResultModal(true);
    }
  }, [finalResult]);

  const hasContent = error || (events.length > 0 && !finalResult) || !!finalResult;

  return (
    <>
      <div className="flex flex-col flex-1 min-h-0">
        <div className={`${!hasContent ? 'pt-[15vh]' : 'pt-0 sm:pt-[10vh]'} flex-shrink-0`}>
          <SearchBox
            onSearch={(q) => { setAbortedQuery(q); sendQuery(q); }}
            onAbort={() => { setAbortedQuery(currentQuery); abort(); }}
            isLoading={isLoading}
            defaultQuery={abortedQuery}
            defaultQueryVersion={autoQueryVersion}
            hideSuggestions={hasContent}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && (
            <div className="w-full max-w-3xl mx-auto mt-6 smart-error-card rounded-xl">
              <p className="font-medium">出错了</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}
          {events.length > 0 && !finalResult && (
            <StreamViewer events={events} dayProgressList={dayProgressList} streamContent={streamContent} />
          )}
          {finalResult && !showResultModal && (
            <div className="w-full max-w-3xl mx-auto mt-6 text-center">
              <button
                onClick={() => setShowResultModal(true)}
                className="px-6 py-3 rounded-xl text-white font-medium text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, var(--smart-primary), var(--smart-secondary))' }}
              >
                📋 查看行程规划结果
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 行程结果弹窗 */}
      {finalResult && showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">行程规划结果</h2>
              <button
                onClick={() => setShowResultModal(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ItineraryCard itinerary={finalResult} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IconTabNav({ mode, onModeChange }: { mode: AppMode; onModeChange: (m: AppMode) => void }) {
  const tabs: { key: AppMode; label: string; icon: React.ReactNode }[] = [
    {
      key: 'midpoint',
      label: '智能中点',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      key: 'planner',
      label: '行程规划',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      key: 'draw',
      label: '多人抽签',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
  ];

  const tabButtons = tabs.map((tab) => {
    const active = mode === tab.key;
    return (
      <button
        key={tab.key}
        onClick={() => onModeChange(tab.key)}
        className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
          active ? 'smart-tab-btn-active shadow-sm' : 'smart-tab-btn-idle hover:bg-white/40'
        }`}
      >
        {tab.icon}
        <span className="text-xs font-medium">{tab.label}</span>
      </button>
    );
  });

  return (
    <>
      {/* 桌面端：顶部 tab */}
      <div className="hidden sm:flex items-center gap-1">
        {tabButtons}
      </div>
      {/* 移动端：底部固定导航栏 */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-2 bg-white/80 backdrop-blur-md border-t border-white/60 shadow-lg">
        {tabButtons}
      </div>
    </>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>('draw');
  const [autoQuery, setAutoQuery] = useState('');
  const [autoQueryVersion, setAutoQueryVersion] = useState(0);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  const handleCitySelect = (city: string) => {
    const query = `想去${city}玩3天2晚，预算6000元，2人出行，请安排详细旅游行程、交通建议和美食推荐`;
    setMode('planner');
    setAutoQuery(query);
    setAutoQueryVersion((v) => v + 1);
  };

  const modeDescriptions: Record<AppMode, string> = {
    planner: '智能旅游规划助手，为您定制完美行程',
    midpoint: '计算多人出发的最佳会合城市',
    draw: '多人提交心仪城市，随机抽签决定目的地',
  };

  return (
    <div className="h-screen overflow-hidden smarttour-bg flex flex-col">
      <header className="flex-shrink-0 mx-auto w-full max-w-6xl px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-shrink-0 min-w-0">
            <h1 className="smart-text-strong text-lg font-bold tracking-tight">SmartTour</h1>
            <p className="smart-text-muted text-xs mt-0.5">{modeDescriptions[mode]}</p>
          </div>
          <IconTabNav
            mode={mode}
            onModeChange={(m) => {
              setMode(m);
              if (m !== 'draw' && m !== 'midpoint') setRoomInfo(null);
            }}
          />
        </div>
        {roomInfo && (
          <div className="flex items-center justify-center gap-3 mt-2 py-1.5 px-3 rounded-xl bg-white/30">
            <p className="smart-text-strong text-xl font-bold tracking-widest leading-none">{roomInfo.roomId}</p>
            <div className="flex items-center gap-1.5">
              <span className={`smart-status-pill ${roomInfo.isConnected ? 'smart-status-ok' : 'smart-status-danger'}`}>
                {roomInfo.isConnected ? '已连接' : '未连接'}
              </span>
              {roomInfo.isHost && <span className="smart-status-pill smart-status-host">您是房主</span>}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0">
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-20 sm:pb-4 h-full flex flex-col items-stretch">
          {mode === 'planner' && (
            <div className="flex flex-col flex-1">
              <TripPlanner autoQuery={autoQuery} autoQueryVersion={autoQueryVersion} />
            </div>
          )}
          {mode === 'midpoint' && (
            <MidpointCalculator onSelectCity={handleCitySelect} onRoomChange={setRoomInfo} />
          )}
          {mode === 'draw' && (
            <RandomDraw onSelectCity={handleCitySelect} onRoomChange={setRoomInfo} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
