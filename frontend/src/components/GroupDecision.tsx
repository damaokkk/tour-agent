import { useState } from 'react';
import { MidpointCalculator } from './MidpointCalculator';
import { RandomDraw } from './RandomDraw';

interface GroupDecisionProps {
  onSelectCity: (city: string) => void;
}

type GroupMode = 'midpoint' | 'draw';

export function GroupDecision({ onSelectCity }: GroupDecisionProps) {
  const [mode, setMode] = useState<GroupMode>('draw');

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="smart-card p-3 md:p-4">
        <div className="smart-pill-shell mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('midpoint')}
            className={`smart-tab-btn ${mode === 'midpoint' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              智能中点
            </span>
          </button>

          <button
            onClick={() => setMode('draw')}
            className={`smart-tab-btn ${mode === 'draw' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              多人出行决策
            </span>
          </button>
        </div>

        <div className="smart-card-inner p-4 md:p-6">
          {mode === 'midpoint' ? <MidpointCalculator onSelectCity={onSelectCity} /> : <RandomDraw onSelectCity={onSelectCity} />}
        </div>
      </div>
    </div>
  );
}
