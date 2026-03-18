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
  summary?: string;
  days: DayPlan[];
  tips?: string[];
}

interface ItineraryCardProps {
  itinerary: Itinerary;
}

const TYPE_COLORS: Record<string, string> = {
  景点: 'bg-blue-100 text-blue-700',
  餐饮: 'bg-orange-100 text-orange-700',
  交通: 'bg-green-100 text-green-700',
  住宿: 'bg-purple-100 text-purple-700',
  购物: 'bg-pink-100 text-pink-700',
  其他: 'bg-gray-100 text-gray-700',
};

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { destination, totalBudget, estimatedCost, summary, days, tips } = itinerary;
  const isOverBudget = estimatedCost > totalBudget;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* 头部信息 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">{destination} · {days.length}天行程</h2>
        {summary && <p className="text-primary-100">{summary}</p>}
        
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-sm text-primary-200">总预算</p>
            <p className="text-xl font-semibold">¥{totalBudget.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-primary-200">预估花费</p>
            <p className={`text-xl font-semibold ${isOverBudget ? 'text-red-300' : ''}`}>
              ¥{estimatedCost.toLocaleString()}
              {isOverBudget && <span className="text-sm ml-2">(超预算)</span>}
            </p>
          </div>
          <div>
            <p className="text-sm text-primary-200">剩余</p>
            <p className="text-xl font-semibold">
              ¥{(totalBudget - estimatedCost).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 每日行程 */}
      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Day {day.day}
                  {day.theme && <span className="ml-3 text-sm font-normal text-gray-500">{day.theme}</span>}
                </h3>
                <span className="text-sm text-gray-500">
                  当日花费: ¥{day.dailyCost.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {day.activities.map((activity, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-16 text-sm text-gray-500 font-medium">
                      {activity.time}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[activity.type]}`}>
                          {activity.type}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{activity.name}</h4>
                          {activity.description && (
                            <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                          )}
                          {activity.location && (
                            <p className="text-xs text-gray-400 mt-1">📍 {activity.location}</p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          ¥{activity.cost}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 小贴士 */}
      {tips && tips.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
          <h3 className="text-lg font-semibold text-amber-800 mb-3">💡 旅行小贴士</h3>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="text-amber-700 text-sm flex items-start gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
