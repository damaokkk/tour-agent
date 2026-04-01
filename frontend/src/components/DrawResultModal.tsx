import { useEffect, useRef, useState } from 'react';
import Modal from './ui/Modal';

/**
 * DrawResultModal 抽奖弹窗
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

interface DrawResultModalProps {
  isOpen: boolean;
  rollingCity: string | null;
  resultCity: string | null;
  isHost: boolean;
  onUseCity: (city: string) => void;
  onDrawAgain: () => void;
  onClose: () => void;
}

/** 动画阶段 */
type DrawPhase = 'rolling' | 'settling' | 'result';

/** 滚动动画用的城市名列表（快速切换制造随机感） */
const ROLLING_CITIES = [
  '北京', '上海', '成都', '广州', '杭州', '西安', '重庆', '南京',
  '武汉', '厦门', '青岛', '大理', '丽江', '三亚', '苏州', '长沙',
];

export function DrawResultModal({
  isOpen,
  rollingCity,
  resultCity,
  isHost,
  onUseCity,
  onDrawAgain,
  onClose,
}: DrawResultModalProps) {
  const [phase, setPhase] = useState<DrawPhase>('rolling');
  const [displayCity, setDisplayCity] = useState<string>('');
  const rollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settlingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollingIndexRef = useRef(0);

  /** 清理所有定时器 */
  const clearTimers = () => {
    if (rollingTimerRef.current) {
      clearInterval(rollingTimerRef.current);
      rollingTimerRef.current = null;
    }
    if (settlingTimerRef.current) {
      clearTimeout(settlingTimerRef.current);
      settlingTimerRef.current = null;
    }
  };

  /** 弹窗关闭时重置状态 */
  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setPhase('rolling');
      setDisplayCity('');
    }
  }, [isOpen]);

  /**
   * 处理 rollingCity 变化：
   * - 有 rollingCity → 进入 rolling 阶段，快速切换城市名
   * Requirements: 6.1
   */
  useEffect(() => {
    if (!isOpen) return;

    if (rollingCity) {
      // 如果已经在 result 阶段（再抽一次），重置回 rolling
      setPhase('rolling');
      clearTimers();

      // 快速轮播城市名，制造滚动感
      rollingIndexRef.current = 0;
      rollingTimerRef.current = setInterval(() => {
        rollingIndexRef.current = (rollingIndexRef.current + 1) % ROLLING_CITIES.length;
        setDisplayCity(ROLLING_CITIES[rollingIndexRef.current]);
      }, 80);
    }

    return () => {
      // 不在这里清理，由 resultCity effect 或 isOpen effect 负责
    };
  }, [rollingCity, isOpen]);

  /**
   * 处理 resultCity 变化：
   * - 若有 rollingCity（rolling 阶段）→ 先进入 settling（0.5s 减速），再定格
   * - 若无 rollingCity（直接收到结果）→ 跳过 rolling，直接进入 result
   * Requirements: 6.2, 6.3
   */
  useEffect(() => {
    if (!isOpen || !resultCity) return;

    clearTimers();

    if (rollingCity) {
      // 有 rolling 过程 → settling 阶段（0.5s 减速过渡）
      setPhase('settling');
      setDisplayCity(resultCity);
      settlingTimerRef.current = setTimeout(() => {
        setPhase('result');
      }, 500);
    } else {
      // 直接收到结果，跳过 rolling → 直接 result（Requirements 6.3）
      setDisplayCity(resultCity);
      setPhase('result');
    }
  }, [resultCity, isOpen]);

  // 组件卸载时清理
  useEffect(() => {
    return () => clearTimers();
  }, []);

  /** 点击"再抽一次" */
  const handleDrawAgain = () => {
    // 重置到 rolling 阶段，不关闭弹窗（Requirements 6.7）
    clearTimers();
    setPhase('rolling');
    setDisplayCity('');
    onDrawAgain();
  };

  /** 点击"用此城市生成行程" */
  const handleUseCity = () => {
    if (resultCity) {
      onUseCity(resultCity);
    }
  };

  const isResult = phase === 'result';
  const isRolling = phase === 'rolling';
  const isSettling = phase === 'settling';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎲 抽签结果"
      dismissible={isResult}
    >
      <div className="flex flex-col items-center gap-6 py-4">
        {/* 城市名展示区 */}
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-sm text-[var(--smart-text-muted)]">
            {isRolling && '抽签中...'}
            {isSettling && '即将揭晓...'}
            {isResult && '抽签结果'}
          </p>

          {/* 城市名大字 */}
          <div
            className={[
              'text-5xl font-bold text-center min-h-[4rem] flex items-center justify-center transition-all duration-300',
              isRolling
                ? 'animate-pulse text-[var(--smart-secondary)] scale-95'
                : isSettling
                  ? 'text-[var(--smart-primary)] scale-100'
                  : 'text-[var(--smart-text-strong)] scale-110',
            ].join(' ')}
            style={{
              transition: isSettling ? 'transform 0.5s ease-out, color 0.5s ease-out' : undefined,
            }}
          >
            {displayCity || (isRolling ? '...' : '')}
          </div>
        </div>

        {/* 操作按钮区（仅 result 阶段显示） */}
        {/* Requirements: 6.4, 6.5, 6.6, 6.7, 6.8 */}
        {isResult && (
          <div className="flex flex-col gap-3 w-full">
            {/* 主按钮：用此城市生成行程（全宽） */}
            <button
              onClick={handleUseCity}
              className="smart-main-btn w-full py-3 text-base"
            >
              用此城市生成行程
            </button>

            {/* 次级按钮：再抽一次（仅 host，全宽） */}
            {/* Requirements: 6.4 isHost=true 时显示，6.5 isHost=false 时不显示 */}
            {isHost && (
              <button
                onClick={handleDrawAgain}
                className="smart-outline-btn w-full py-3 text-base rounded-2xl"
              >
                再抽一次
              </button>
            )}
            {/* 注意：弹窗不包含"重新选城市"按钮（Requirements 6.8） */}
          </div>
        )}

        {/* rolling/settling 阶段的加载指示 */}
        {!isResult && (
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[var(--smart-primary)] opacity-60"
                style={{
                  animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DrawResultModal;
