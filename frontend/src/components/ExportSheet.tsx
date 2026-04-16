import { useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import { exportItinerary, itineraryToText, type Itinerary } from '../utils/itineraryExport';
import type React from 'react';

/**
 * 行程导出底部弹窗
 * 需求：2.1、2.2、2.3、2.4、2.5、2.6、2.7、2.8、2.9、2.10
 */
interface ExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary;
  cardRef: React.RefObject<HTMLDivElement | null>;
}

type ExportAction = 'copy' | 'pdf' | 'image' | 'share';

interface ExportState {
  loading: ExportAction | null;
  error: string | null;
  copySuccess: boolean;
  shareUrlFallback: string | null;
  clipboardFallback: string | null;
}

const EXPORT_OPTIONS = [
  { id: 'copy',  icon: '📋', label: '复制文本',  desc: '复制完整行程文字' },
  { id: 'pdf',   icon: '📄', label: '导出 PDF',  desc: '下载 PDF 文件' },
  { id: 'image', icon: '🖼️', label: '导出图片',  desc: '保存为 PNG 图片' },
  { id: 'share', icon: '🔗', label: '分享链接',  desc: '通过系统分享菜单' },
] as const;

function ExportSheet({ isOpen, onClose, itinerary, cardRef }: ExportSheetProps) {
  const [state, setState] = useState<ExportState>({
    loading: null,
    error: null,
    copySuccess: false,
    shareUrlFallback: null,
    clipboardFallback: null,
  });

  const handleExport = async (action: ExportAction) => {
    setState(s => ({ ...s, loading: action, error: null }));
    try {
      await exportItinerary(action, itinerary, cardRef);
      if (action === 'copy') {
        setState(s => ({ ...s, loading: null, copySuccess: true }));
        setTimeout(() => setState(s => ({ ...s, copySuccess: false })), 2000);
      } else {
        setState(s => ({ ...s, loading: null }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (action === 'share' && msg === 'NOT_SUPPORTED') {
        setState(s => ({ ...s, loading: null, shareUrlFallback: window.location.href }));
      } else if (action === 'copy') {
        setState(s => ({
          ...s,
          loading: null,
          clipboardFallback: itineraryToText(itinerary),
        }));
      } else {
        const detail = msg ? `（${msg}）` : '';
        setState(s => ({ ...s, loading: null, error: `导出失败，请重试${detail}` }));
      }
    }
  };

  const isLoading = state.loading !== null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="导出行程">
      <div className="space-y-2">
        {EXPORT_OPTIONS.map(opt => {
          const isThisLoading = state.loading === opt.id;
          const showCheck = opt.id === 'copy' && state.copySuccess;
          return (
            <button
              key={opt.id}
              onClick={() => handleExport(opt.id)}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
              <span className="text-2xl shrink-0">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
              <div className="shrink-0 w-6 flex items-center justify-center">
                {isThisLoading && (
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                )}
                {showCheck && (
                  <span className="text-green-500 text-sm font-semibold">✓</span>
                )}
              </div>
            </button>
          );
        })}

        {/* 复制成功提示 */}
        {state.copySuccess && (
          <p className="text-center text-sm text-green-600 font-medium py-1">已复制</p>
        )}

        {/* 错误提示 */}
        {state.error && (
          <p className="text-center text-sm text-red-500 py-1">{state.error}</p>
        )}

        {/* 剪贴板降级：手动复制文本框 */}
        {state.clipboardFallback !== null && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">请手动复制以下内容：</p>
            <textarea
              readOnly
              value={state.clipboardFallback}
              rows={6}
              className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none bg-gray-50"
              onFocus={e => e.target.select()}
            />
          </div>
        )}

        {/* Web Share 降级：只读链接 */}
        {state.shareUrlFallback !== null && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">复制链接分享：</p>
            <input
              readOnly
              value={state.shareUrlFallback}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50"
              onFocus={e => e.target.select()}
            />
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default ExportSheet;
