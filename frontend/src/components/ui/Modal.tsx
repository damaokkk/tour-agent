import type { MouseEvent } from 'react';
import useScrollLock from '../../hooks/useScrollLock';

/**
 * 通用模态弹窗组件
 * 需求：3.1、3.2、6.1、6.3、6.4
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 是否允许点击遮罩关闭，默认 true */
  dismissible?: boolean;
  children: React.ReactNode;
}

function Modal({
  isOpen,
  onClose,
  title,
  dismissible = true,
  children,
}: ModalProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (dismissible && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
