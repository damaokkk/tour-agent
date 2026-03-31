import { useEffect, useState } from 'react';
import { SearchBox } from './components/SearchBox';
import { StreamViewer } from './components/StreamViewer';
import { ItineraryCard } from './components/ItineraryCard';
import { ModeSwitch, type AppMode } from './components/ModeSwitch';
import { GroupDecision } from './components/GroupDecision';
import { useEventSource } from './hooks/useEventSource';

interface TripPlannerProps {
  autoQuery: string;
  autoQueryVersion: number;
}

function TripPlanner({ autoQuery, autoQueryVersion }: TripPlannerProps) {
  const { events, isLoading, error, sendQuery, abort, currentQuery, finalResult, dayProgressList, streamContent } = useEventSource();
  const [abortedQuery, setAbortedQuery] = useState('');

  useEffect(() => {
    if (autoQuery.trim()) {
      setAbortedQuery(autoQuery);
      sendQuery(autoQuery);
    }
  }, [autoQuery, autoQueryVersion, sendQuery]);

  const handleSearch = (query: string) => {
    setAbortedQuery(query);
    sendQuery(query);
  };

  const handleAbort = () => {
    setAbortedQuery(currentQuery);
    abort();
  };

  return (
    <>
      <SearchBox
        onSearch={handleSearch}
        onAbort={handleAbort}
        isLoading={isLoading}
        defaultQuery={abortedQuery}
        defaultQueryVersion={autoQueryVersion}
      />

      {error && (
        <div className="w-full max-w-3xl mx-auto mt-6 smart-error-card rounded-xl">
          <p className="font-medium">出错了</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {events.length > 0 && !finalResult && (
        <StreamViewer
          events={events}
          dayProgressList={dayProgressList}
          streamContent={streamContent}
        />
      )}

      {finalResult && <ItineraryCard itinerary={finalResult} />}
    </>
  );
}

function App() {
  const [mode, setMode] = useState<AppMode>('planner');
  const [autoQuery, setAutoQuery] = useState('');
  const [autoQueryVersion, setAutoQueryVersion] = useState(0);

  const handleGroupDecisionSelect = (city: string) => {
    const query = `想去${city}玩3天2晚，预算6000元，2人出行，请安排详细旅游行程、交通建议和美食推荐`;
    setMode('planner');
    setAutoQuery(query);
    setAutoQueryVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen smarttour-bg">
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 md:pt-10">
        <header className="mb-7 text-center md:mb-10">
          <div className="smart-brand-badge mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm shadow-sm backdrop-blur">
            <span className="smart-brand-dot h-2 w-2 rounded-full" />
            SmartTour
          </div>
          <h1 className="smart-text-strong text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">SmartTour</h1>
          <p className="smart-text-muted mx-auto mt-3 max-w-2xl text-sm sm:text-base md:text-lg">
            {mode === 'planner' ? '智能旅游规划助手，为您定制完美行程' : '多人出行决策助手，一起决定旅游目的地'}
          </p>
        </header>

        <ModeSwitch currentMode={mode} onModeChange={setMode} />

        <main className="mt-6 md:mt-8">
          {mode === 'planner' ? (
            <TripPlanner autoQuery={autoQuery} autoQueryVersion={autoQueryVersion} />
          ) : (
            <GroupDecision onSelectCity={handleGroupDecisionSelect} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
