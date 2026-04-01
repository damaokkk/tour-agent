import { useEffect, useRef, useState } from 'react';
import useScrollLock from '../../hooks/useScrollLock';
import useSwipeToClose from '../../hooks/useSwipeToClose';

/**
 * 通用底部弹窗组件
 * 需求：6.1、6.2、6.3、6.4、6.5、6.6、6.7
 */
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** 是否允许点击遮罩/下滑关闭，默认 true */
  dismissible?: boolean;
  /** 最大高度，默认 '90vh' */
  maxHeight?: string;
  children: React.ReactNode;
}

function BottomSheet({
  isOpen,
  onClose,
  title,
  dismissible = true,
  maxHeight = '90vh',
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [bottomOffset, setBottomOffset] = useState(0);

  useScrollLock(isOpen);
  useSwipeToClose(sheetRef, { onClose, enabled: dismissible && isOpen });

  // 键盘适配：监听 visualViewport resize，动态调整 bottom 偏移
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setBottomOffset(Math.max(0, offset));
    };

    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  const handleOverlayClick = () => {
    if (dismissible) onClose();
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* 弹窗容器 */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 z-50 bg-white rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        style={{
          bottom: bottomOffset,
          maxHeight,
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s ease-out',
          overflowY: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-1">
          <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        </div>

        {/* 标题 */}
        {title && (
          <div className="px-4 pb-2">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          </div>
        )}

        {/* 内容 */}
        <div className="px-4 pb-4">{children}</div>
      </div>
    </>
  );
}

export default BottomSheet;
