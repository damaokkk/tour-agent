import { useState } from 'react';
import { SearchBox } from './components/SearchBox';
import { StreamViewer } from './components/StreamViewer';
import { ItineraryCard } from './components/ItineraryCard';
import { TripPreviewModal } from './components/TripPreviewModal';
import { ModeSwitch, type AppMode } from './components/ModeSwitch';
import { GroupDecision } from './components/GroupDecision';
import { useEventSource } from './hooks/useEventSource';

// 智能行程规划模式
function TripPlanner() {
  const { events, isLoading, error, sendQuery, finalResult, dayProgressList, streamContent } = useEventSource();
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  // 先调用预览接口，再决定是否开始规划
  const handleSearch = async (query: string) => {
    try {
      // 调用预览接口
      const response = await fetch('http://localhost:8000/api/v1/tour/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      if (!response.ok) {
        throw new Error('预览失败');
      }
      
      const data = await response.json();
      setPreviewData(data.preview);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview error:', err);
      // 如果预览接口失败，直接开始规划（兼容旧流程）
      sendQuery(query);
    }
  };

  // 用户确认方案后，开始正式规划
  const handleConfirm = () => {
    if (!previewData) return;
    
    setShowPreview(false);
    setIsPlanning(true);
    
    // 重新发送原始查询，开始完整规划流程
    // 注意：这里需要重构 query，但为了简化，我们直接使用用户的原始输入
    // 更好的方式是将 previewData.intent 转换为自然语言查询
    const reconstructedQuery = reconstructQueryFromIntent(previewData.intent);
    sendQuery(reconstructedQuery);
    setIsPlanning(false);
  };

  // 从 intent 重构查询语句
  const reconstructQueryFromIntent = (intent: any): string => {
    let parts = [];
    
    if (intent.origin) {
      parts.push(`从${intent.origin}到${intent.destination}`);
    } else {
      parts.push(`去${intent.destination}`);
    }
    
    parts.push(`${intent.days}天`);
    
    if (intent.travelers > 1) {
      parts.unshift(`${intent.travelers}个人`);
    }
    
    parts.push(`预算${intent.budget}元`);
    
    if (intent.mustVisit && intent.mustVisit.length > 0) {
      parts.push(`必去${intent.mustVisit.join('和')}`);
    }
    
    if (intent.foodPrefs && intent.foodPrefs.length > 0) {
      parts.push(`想吃${intent.foodPrefs.join('和')}`);
    }
    
    return parts.join('，');
  };

  return (
    <>
      {/* 搜索区域 */}
      <SearchBox onSearch={handleSearch} isLoading={isLoading || isPlanning} />

      {/* 错误提示 */}
      {error && (
        <div className="w-full max-w-3xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-medium">出错了</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 流式进度展示 */}
      {events.length > 0 && !finalResult && (
        <StreamViewer 
          events={events} 
          dayProgressList={dayProgressList} 
          streamContent={streamContent}
        />
      )}

      {/* 行程结果 */}
      {finalResult && (
        <ItineraryCard itinerary={finalResult} />
      )}

      {/* 方案预览弹窗 */}
      <TripPreviewModal
        preview={previewData}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
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


      </div>
    </div>
  );
}

export default App;
