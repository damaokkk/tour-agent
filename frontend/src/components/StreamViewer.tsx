import { StreamEvent, DayProgress } from '../hooks/useEventSource';

interface StreamViewerProps {
  events: StreamEvent[];
  dayProgressList?: DayProgress[];
  streamContent?: string;
}

const STATUS_ICONS: Record<string, string> = {
  extracting: '🔍',
  searching: '🌐',
  planning: '✨',
  planning_stream: '✨',
  planning_progress: '✨',
  validating: '✓',
  success: '🎉',
  error: '❌',
  aborted: '⏹',
};

const STATUS_COLORS: Record<string, string> = {
  extracting: 'text-blue-600 bg-blue-50',
  searching: 'text-purple-600 bg-purple-50',
  planning: 'text-amber-600 bg-amber-50',
  planning_stream: 'text-amber-600 bg-amber-50',
  planning_progress: 'text-amber-600 bg-amber-50',
  planning_complete: 'text-green-600 bg-green-50',
  validating: 'text-green-600 bg-green-50',
  success: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
  aborted: 'text-gray-500 bg-gray-100',
};

const STATUS_LABELS: Record<string, string> = {
  extracting: '需求解析',
  searching: '信息搜索',
  planning: '智能规划',
  planning_stream: '智能规划',
  planning_progress: '规划进行中',
  planning_complete: '规划完成',
  validating: '行程校验',
  success: '规划完成',
  error: '出错了',
  aborted: '已停止',
};

// 加载动画组件
function LoadingSpinner() {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function StreamViewer({ events, dayProgressList = [], streamContent = '' }: StreamViewerProps) {
  if (events.length === 0) return null;

  const latestEvent = events[events.length - 1];
  
  // 获取当前阶段的详细信息
  const getPlanningDetail = () => {
    const data = latestEvent.data;
    if (!data) return null;
    
    const details: string[] = [];
    // 显示搜索维度而非数量
    if (data.dimensions && Array.isArray(data.dimensions)) {
      details.push(`已搜索：${data.dimensions.join('、')}`);
    } else if (data.referenceCount) {
      details.push(`已参考${data.referenceCount}条攻略`);
    }
    if (data.totalDays) details.push(`共${data.totalDays}天行程`);
    if (data.estimatedCost) details.push(`预估费用¥${data.estimatedCost}`);
    
    return details.length > 0 ? details.join(' · ') : null;
  };

  // 计算实际进度（基于阶段而非事件数量）
  // 如果有逐日进度，使用更精细的进度计算
  const getProgressPercent = () => {
    const stageWeights: Record<string, number> = {
      extracting: 15,
      searching: 40,
      planning: 75,
      planning_progress: 75,
      planning_stream: 75,
      planning_complete: 85,
      validating: 90,
      success: 100,
      error: 100,
    };
    
    // 如果在规划阶段且有逐日进度，计算更精细的进度
    if (latestEvent.status === 'planning' || latestEvent.status === 'planning_progress') {
      if (dayProgressList.length > 0 && latestEvent.data?.totalDays) {
        const baseProgress = 40; // 搜索阶段结束时的进度
        const planningRange = 35; // 规划阶段占的进度范围 (75-40)
        const dayProgress = (dayProgressList.length / latestEvent.data.totalDays) * planningRange;
        return Math.round(baseProgress + dayProgress);
      }
    }
    
    return stageWeights[latestEvent.status] || 0;
  };

  // 过滤历史记录：每个阶段只保留关键节点，避免过多细节
  // 修复：当前正在进行的阶段不应出现在已完成列表中
  const getKeyEvents = () => {
    const keyEvents: typeof events = [];
    let lastStatus = '';
    
    // 获取当前正在进行的状态
    const currentStatus = latestEvent.status;
    
    for (const event of events.slice(0, -1)) {
      // 跳过与当前状态相同的历史事件（避免当前进行中的阶段显示"已完成"）
      if (event.status === currentStatus) {
        continue;
      }
      
      // 只保留阶段转换的关键节点
      if (event.status !== lastStatus) {
        keyEvents.push(event);
        lastStatus = event.status;
      }
    }
    
    // 最多显示最近4个关键节点
    return keyEvents.slice(-4);
  };

  const keyEvents = getKeyEvents();

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          规划进度
        </h3>

        {/* 进度条 - 放在标题下方 */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>总进度</span>
            <span>{getProgressPercent()}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-700 ease-out"
              style={{
                width: `${getProgressPercent()}%`,
              }}
            />
          </div>
          {/* 阶段指示器 */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span className={latestEvent.status === 'extracting' ? 'text-primary-600 font-medium' : ''}>解析</span>
            <span className={latestEvent.status === 'searching' ? 'text-primary-600 font-medium' : ''}>搜索</span>
            <span className={latestEvent.status === 'planning' || latestEvent.status === 'planning_progress' || latestEvent.status === 'planning_stream' || latestEvent.status === 'planning_complete' ? 'text-primary-600 font-medium' : ''}>规划</span>
            <span className={latestEvent.status === 'validating' ? 'text-primary-600 font-medium' : ''}>校验</span>
            <span className={latestEvent.status === 'success' ? 'text-primary-600 font-medium' : ''}>完成</span>
          </div>
        </div>

        {/* 当前状态卡片 - 突出显示 */}
        <div className={`p-5 rounded-xl ${STATUS_COLORS[latestEvent.status] || STATUS_COLORS.planning} mb-4`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{STATUS_ICONS[latestEvent.status] || STATUS_ICONS.planning}</span>
            <div className="flex-1 min-w-0">
              {/* 阶段标签 */}
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/60 mb-2">
                {STATUS_LABELS[latestEvent.status] || STATUS_LABELS.planning}
              </span>
              {/* 主消息：planning_progress 时，若还有下一天待规划，显示"正在规划第X天"而非"已完成第X天" */}
              <p className="font-medium text-base">
                {latestEvent.status === 'planning_progress' &&
                 dayProgressList.length > 0 &&
                 dayProgressList.length < (latestEvent.data?.totalDays || 0)
                  ? `正在规划第 ${dayProgressList.length + 1} 天...`
                  : latestEvent.message}
              </p>
              {/* 详细信息 */}
              {(latestEvent.status === 'planning' || latestEvent.status === 'planning_progress' || latestEvent.status === 'planning_stream') && getPlanningDetail() && (
                <p className="text-sm opacity-80 mt-2">
                  {getPlanningDetail()}
                </p>
              )}
            </div>
            {latestEvent.status !== 'success' && latestEvent.status !== 'error' && latestEvent.status !== 'aborted' && (
              <LoadingSpinner />
            )}
          </div>
        </div>

        {/* 流式输出内容展示已隐藏，原始 JSON chunk 不对用户展示 */}

        {/* 逐日生成进度展示 */}
        {dayProgressList.length > 0 && !events.some(e => e.status === 'success') && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">逐日规划进度</h4>
              <span className="text-xs text-gray-500">
                已完成 {dayProgressList.length}/{latestEvent.data?.totalDays || dayProgressList.length} 天
              </span>
            </div>
            <div className="space-y-2">
              {dayProgressList
                .sort((a, b) => a.day.day - b.day.day)
                .map((progress) => (
                <div 
                  key={progress.day.day} 
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                    {progress.day.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {progress.day.theme}
                    </p>
                    <p className="text-xs text-gray-500">
                      {progress.day.activities?.length || 0} 个活动 · ¥{progress.day.dailyCost?.toLocaleString() || 0}
                    </p>
                  </div>
                  <span className="text-xs text-green-600 font-medium">✓</span>
                </div>
              ))}
            </div>
            {/* 正在生成下一天的提示 */}
            {dayProgressList.length < (latestEvent.data?.totalDays || 0) && (
              <div className="flex items-center gap-3 p-3 mt-2 rounded-lg border border-dashed border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-medium">
                  {dayProgressList.length + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">正在规划第 {dayProgressList.length + 1} 天...</p>
                </div>
                <LoadingSpinner />
              </div>
            )}
          </div>
        )}

        {/* 关键历史步骤 - 只显示阶段转换节点 */}
        {keyEvents.length > 0 && (
          <div className="space-y-2">
            {keyEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center gap-2 md:gap-3 p-2.5 rounded-lg bg-gray-50 text-gray-600"
              >
                <span className="text-lg">{STATUS_ICONS[event.status]}</span>
                <span className="text-sm truncate flex-1">{event.message}</span>
                <span className="text-xs text-gray-400 shrink-0">已完成</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
