import { StreamEvent } from '../hooks/useEventSource';

interface StreamViewerProps {
  events: StreamEvent[];
}

const STATUS_ICONS: Record<string, string> = {
  extracting: '🔍',
  searching: '🌐',
  planning: '✨',
  validating: '✓',
  success: '🎉',
  error: '❌',
};

const STATUS_COLORS: Record<string, string> = {
  extracting: 'text-blue-600 bg-blue-50',
  searching: 'text-purple-600 bg-purple-50',
  planning: 'text-amber-600 bg-amber-50',
  validating: 'text-green-600 bg-green-50',
  success: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
};

export function StreamViewer({ events }: StreamViewerProps) {
  if (events.length === 0) return null;

  const latestEvent = events[events.length - 1];

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          规划进度
        </h3>

        {/* 当前状态 */}
        <div className={`p-4 rounded-xl ${STATUS_COLORS[latestEvent.status]} mb-4`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{STATUS_ICONS[latestEvent.status]}</span>
            <div className="flex-1">
              <p className="font-medium">{latestEvent.message}</p>
              {latestEvent.data?.query && (
                <p className="text-sm opacity-75 mt-1">
                  搜索: {latestEvent.data.query}
                </p>
              )}
            </div>
            {latestEvent.status !== 'success' && latestEvent.status !== 'error' && (
              <div className="animate-pulse">
                <div className="h-2 w-2 bg-current rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* 历史步骤 */}
        <div className="space-y-2">
          {events.slice(0, -1).map((event, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-600"
            >
              <span className="text-lg">{STATUS_ICONS[event.status]}</span>
              <span className="text-sm">{event.message}</span>
              <span className="ml-auto text-xs text-gray-400">已完成</span>
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div className="mt-4">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-500"
              style={{
                width: `${Math.min((events.length / 6) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
