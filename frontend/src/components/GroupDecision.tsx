import { useState } from 'react';
import { MidpointCalculator } from './MidpointCalculator';
import { RandomDraw } from './RandomDraw';

interface GroupDecisionProps {
  onSelectCity: (city: string) => void;
}

type GroupMode = 'midpoint' | 'draw';

export function GroupDecision({ onSelectCity }: GroupDecisionProps) {
  const [mode, setMode] = useState<GroupMode>('midpoint');

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* 子模式切换 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setMode('midpoint')}
            className={`
              px-5 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${mode === 'midpoint'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              智能中点
            </span>
          </button>
          <button
            onClick={() => setMode('draw')}
            className={`
              px-5 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${mode === 'draw'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" 
                />
              </svg>
              随机抽签
            </span>
          </button>
        </div>
      </div>

      {/* 功能区域 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
        {mode === 'midpoint' ? (
          <MidpointCalculator onSelectCity={onSelectCity} />
        ) : (
          <RandomDraw onSelectCity={onSelectCity} />
        )}
      </div>
    </div>
  );
}
