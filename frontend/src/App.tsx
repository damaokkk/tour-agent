import { SearchBox } from './components/SearchBox';
import { StreamViewer } from './components/StreamViewer';
import { ItineraryCard } from './components/ItineraryCard';
import { useEventSource } from './hooks/useEventSource';

function App() {
  const { events, isLoading, error, sendQuery, finalResult } = useEventSource();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-6 md:py-12">
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

        {/* 底部信息 */}
        <div className="text-center mt-16 text-sm text-gray-400">
          <p>SmartTour Agent Demo · Powered by OpenAI & Tavily</p>
        </div>
      </div>
    </div>
  );
}

export default App;
