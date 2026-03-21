import React from 'react';

export type AppMode = 'planner' | 'group';

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitch({ currentMode, onModeChange }: ModeSwitchProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex bg-gray-100 rounded-xl p-1.5 shadow-inner">
        <button
          onClick={() => onModeChange('planner')}
          className={`
            px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${currentMode === 'planner'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.806-.984A1 1 0 0118 5.618l-4.553 2.276M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            智能行程规划
          </span>
        </button>
        <button
          onClick={() => onModeChange('group')}
          className={`
            px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${currentMode === 'group'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            多人出行决策
          </span>
        </button>
      </div>
    </div>
  );
}
