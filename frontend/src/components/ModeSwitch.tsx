import React from 'react';

export type AppMode = 'planner' | 'group';

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitch({ currentMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex justify-center mb-6 md:mb-8">
      <div className="smart-pill-shell inline-grid grid-cols-2 gap-1.5 p-1.5 w-full max-w-sm sm:w-auto">
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
            <span className="truncate">智能行程规划</span>
          </span>
        </button>
        <button
          onClick={() => onModeChange('group')}
          className={`smart-tab-btn ${currentMode === 'group' ? 'smart-tab-btn-active' : 'smart-tab-btn-idle'}`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="truncate">多人出行决策</span>
          </span>
        </button>
      </div>
    </div>
  );
}
