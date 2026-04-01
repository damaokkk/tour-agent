import { useRef, useState } from 'react';
import ExportSheet from './ExportSheet';

interface Activity {
  time: string;
  name: string;
  type: '景点' | '餐饮' | '交通' | '住宿' | '购物' | '其他';
  description?: string;
  cost: number;
  location?: string;
}

interface DayPlan {
  day: number;
  theme?: string;
  activities: Activity[];
  dailyCost: number;
}

interface Itinerary {
  destination: string;
  totalDays: number;
  totalBudget: number;
  estimatedCost: number;
  travelers?: number;
  summary?: string;
  days: DayPlan[];
  tips?: string[];
}

interface ItineraryCardProps {
  itinerary: Itinerary;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  景点: { bg: '#dbeafe', text: '#1d4ed8', emoji: '🏛️' },
  餐饮: { bg: '#ffedd5', text: '#c2410c', emoji: '🍜' },
  交通: { bg: '#dcfce7', text: '#15803d', emoji: '🚌' },
  住宿: { bg: '#f3e8ff', text: '#7e22ce', emoji: '🏨' },
  购物: { bg: '#fce7f3', text: '#be185d', emoji: '🛍️' },
  其他: { bg: '#f1f5f9', text: '#475569', emoji: '📌' },
};

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { destination, totalBudget, estimatedCost, travelers = 1, summary, days, tips } = itinerary;
  const isOverBudget = estimatedCost > totalBudget;
  const perPersonCost = Math.round(estimatedCost / travelers);
  const remaining = totalBudget - estimatedCost;
  const cardRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div ref={cardRef} className="w-full max-w-4xl mx-auto mt-8 space-y-5 animate-fade-in-up">
      {/* 头部信息卡 */}
      <div
        className="smart-header-card rounded-2xl p-5 md:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="smart-text-strong text-2xl md:text-3xl font-bold">
              {destination}
              <span className="smart-text-muted text-base font-normal ml-2">· {days.length}天行程</span>
            </h2>
            {travelers > 1 && (
              <p className="smart-text-muted text-sm mt-0.5">{travelers} 人同行</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExportOpen(true)}
              className="px-3 py-1.5 text-sm bg-white/80 hover:bg-white border border-gray-200 rounded-lg text-gray-600 flex items-center gap-1.5 transition-colors"
            >
              📤 导出
            </button>
            {isOverBudget && (
              <span className="smart-status-pill smart-status-danger text-xs">超出预算</span>
            )}
          </div>
        </div>

        {summary && (
          <p className="smart-text-muted text-sm mb-4 leading-relaxed">{summary}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '总预算', value: `¥${totalBudget.toLocaleString()}` },
            { label: '预估花费', value: `¥${estimatedCost.toLocaleString()}`, danger: isOverBudget },
            { label: '人均花费', value: `¥${perPersonCost.toLocaleString()}` },
            { label: remaining >= 0 ? '剩余预算' : '超出金额', value: `¥${Math.abs(remaining).toLocaleString()}`, danger: remaining < 0 },
          ].map((item) => (
            <div key={item.label} className="smart-card-inner rounded-xl p-3">
              <p className="smart-text-soft text-xs mb-1">{item.label}</p>
              <p className={`text-lg font-semibold ${item.danger ? 'text-[var(--smart-danger-text)]' : 'smart-text-strong'}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 每日行程 */}
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.day} className="smart-card overflow-hidden">
            {/* 日期头部 */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--smart-border)' }}>
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--smart-primary), var(--smart-secondary))' }}
                >
                  {day.day}
                </span>
                <div>
                  <span className="smart-text-strong font-semibold text-sm">第 {day.day} 天</span>
                  {day.theme && <span className="smart-text-muted text-sm ml-2">{day.theme}</span>}
                </div>
              </div>
              <span className="smart-text-soft text-xs shrink-0">¥{day.dailyCost.toLocaleString()}</span>
            </div>

            {/* 活动列表 */}
            <div className="p-4 md:p-5 space-y-3">
              {day.activities.map((activity, index) => {
                const typeStyle = TYPE_STYLES[activity.type] || TYPE_STYLES['其他'];
                return (
                  <div key={index} className="flex gap-3">
                    {/* 时间轴 */}
                    <div className="flex flex-col items-center shrink-0">
                      <span className="smart-text-soft text-xs w-12 text-right pt-0.5">{activity.time}</span>
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 min-w-0 pb-3 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--smart-border)' }}>
                      <div className="flex items-start gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium shrink-0"
                          style={{ background: typeStyle.bg, color: typeStyle.text }}
                        >
                          {typeStyle.emoji} {activity.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="smart-text-strong font-medium text-sm">{activity.name}</h4>
                            <span className="smart-text-muted text-sm shrink-0 font-medium">¥{activity.cost}</span>
                          </div>
                          {activity.description && (
                            <p className="smart-text-muted text-xs mt-1 leading-relaxed">{activity.description}</p>
                          )}
                          {activity.location && (
                            <p className="smart-text-soft text-xs mt-1">📍 {activity.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 旅行小贴士 */}
      {tips && tips.length > 0 && (
        <div className="smart-card p-5 md:p-6" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <span>💡</span> 旅行小贴士
          </h3>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="text-amber-700 text-sm flex items-start gap-2 leading-relaxed">
                <span className="shrink-0 mt-0.5">•</span>
                <span>{tip.replace(/^[•·\-\s]+/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ExportSheet
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        itinerary={itinerary}
        cardRef={cardRef}
      />
    </div>
  );
}
