import { useState } from 'react';

interface TripPreviewData {
  intent: {
    origin?: string;
    destination: string;
    days: number;
    travelers: number;
    budget: number;
    mustVisit: string[];
    foodPrefs: string[];
  };
  transport: {
    origin: string;
    destination: string;
    distance: number;
    suggestedMode: string;
    travelers: number;
    roundTripCost: number;
    perPersonCost: number;
  } | null;
  budgetAnalysis: {
    totalBudget: number;
    transportCost: number;
    remainingBudget: number;
    dailyBudget: number;
    perPersonDailyBudget: number;
    assessment: '紧张' | '适中' | '充裕';
    tips: string[];
  };
}

interface TripPreviewModalProps {
  preview: TripPreviewData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function TripPreviewModal({ preview, isOpen, onClose, onConfirm, isLoading }: TripPreviewModalProps) {
  const [editedBudget, setEditedBudget] = useState<number | null>(null);

  if (!isOpen || !preview) return null;

  const { intent, transport, budgetAnalysis } = preview;
  const displayBudget = editedBudget !== null ? editedBudget : intent.budget;

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case '紧张': return 'text-orange-600 bg-orange-50';
      case '适中': return 'text-blue-600 bg-blue-50';
      case '充裕': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAssessmentIcon = (assessment: string) => {
    switch (assessment) {
      case '紧张': return '⚠️';
      case '适中': return '✓';
      case '充裕': return '✓';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">📋 行程方案概要</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 基本信息 */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">目的地</span>
                <p className="font-semibold text-gray-800 text-lg">{intent.destination}</p>
              </div>
              <div>
                <span className="text-gray-500">出行天数</span>
                <p className="font-semibold text-gray-800 text-lg">{intent.days} 天</p>
              </div>
              <div>
                <span className="text-gray-500">出行人数</span>
                <p className="font-semibold text-gray-800 text-lg">{intent.travelers} 人</p>
              </div>
              {intent.origin && (
                <div>
                  <span className="text-gray-500">出发地</span>
                  <p className="font-semibold text-gray-800">{intent.origin}</p>
                </div>
              )}
            </div>
          </div>

          {/* 交通信息 */}
          {transport && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                交通信息
              </h3>
              <div className="text-sm space-y-1">
                <p className="text-gray-700">
                  {transport.origin} → {transport.destination}
                </p>
                <p className="text-gray-600">
                  距离 {transport.distance} 公里 · 建议{transport.suggestedMode}
                </p>
                <p className="text-blue-700 font-semibold">
                  {transport.travelers}人往返约 {transport.roundTripCost} 元
                  <span className="text-gray-500 font-normal text-xs ml-2">
                    (人均 {transport.perPersonCost} 元)
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* 预算分析 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              预算分析
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">总预算</span>
                <span className="font-semibold">
                  {budgetAnalysis.totalBudget} 元
                  {intent.travelers > 1 && (
                    <span className="text-gray-400 font-normal ml-1">
                      （人均 {Math.round(budgetAnalysis.totalBudget / intent.travelers)} 元）
                    </span>
                  )}
                </span>
              </div>
              {transport && (
                <div className="flex justify-between text-blue-600">
                  <span>往返交通</span>
                  <span>- {budgetAnalysis.transportCost} 元</span>
                </div>
              )}
              {transport && (
                <div className="flex justify-between text-green-600 font-semibold border-t border-gray-200 pt-2">
                  <span>剩余可支配</span>
                  <span>{budgetAnalysis.remainingBudget} 元</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>日均预算</span>
                <span>{budgetAnalysis.dailyBudget} 元</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>人均每天</span>
                <span>{budgetAnalysis.perPersonDailyBudget} 元</span>
              </div>
            </div>

            {/* 预算评估 */}
            <div className={`mt-3 p-3 rounded-lg ${getAssessmentColor(budgetAnalysis.assessment)}`}>
              <div className="flex items-center gap-2 font-semibold">
                <span>{getAssessmentIcon(budgetAnalysis.assessment)}</span>
                <span>预算{budgetAnalysis.assessment}</span>
              </div>
              <ul className="mt-2 text-sm space-y-1">
                {budgetAnalysis.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 预算调整 */}
            {budgetAnalysis.assessment === '紧张' && (
              <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700 mb-2">预算较紧张，建议调整：</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditedBudget(intent.budget + 1000)}
                    className="px-3 py-1.5 text-sm bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    +1000元
                  </button>
                  <button
                    onClick={() => setEditedBudget(intent.budget + 2000)}
                    className="px-3 py-1.5 text-sm bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    +2000元
                  </button>
                  <button
                    onClick={() => setEditedBudget(Math.round(intent.budget * 1.5))}
                    className="px-3 py-1.5 text-sm bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    ×1.5
                  </button>
                </div>
                {editedBudget !== null && (
                  <p className="mt-2 text-sm text-orange-600">
                    调整后预算：{editedBudget} 元
                    <button
                      onClick={() => setEditedBudget(null)}
                      className="ml-2 text-gray-500 underline"
                    >
                      取消
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 其他需求 */}
          {(intent.mustVisit.length > 0 || intent.foodPrefs.length > 0) && (
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-purple-800 mb-2">其他需求</h3>
              {intent.mustVisit.length > 0 && (
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">必去景点：</span>
                  {intent.mustVisit.join('、')}
                </p>
              )}
              {intent.foodPrefs.length > 0 && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="text-gray-500">餐饮偏好：</span>
                  {intent.foodPrefs.join('、')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium disabled:bg-gray-300"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  规划中...
                </span>
              ) : (
                '确认开始规划'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
