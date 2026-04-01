export type AppMode = 'planner' | 'midpoint' | 'draw';

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitch({ currentMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex justify-center mb-4">
      <div className="smart-pill-shell inline-grid grid-cols-3 gap-1.5 p-1.5 w-full max-w-lg">
        <button
          onClick={() => onModeChange('planner')}
          className={`smart-tab-btn ${currentMode === 'planner' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <span className="truncate">行程规划</span>
          </span>
        </button>
        <button
          onClick={() => onModeChange('midpoint')}
          className={`smart-tab-btn ${currentMode === 'midpoint' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">智能中点</span>
          </span>
        </button>
        <button
          onClick={() => onModeChange('draw')}
          className={`smart-tab-btn ${currentMode === 'draw' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="truncate">多人抽签</span>
          </span>
        </button>
      </div>
    </div>
  );
}
