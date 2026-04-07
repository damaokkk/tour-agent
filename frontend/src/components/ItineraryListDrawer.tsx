import { useEffect, useState } from 'react';
import type { ItinerarySummary } from '../types/itinerary';
import { useItineraryStore } from '../hooks/useItineraryStore';

interface ItineraryListDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (id: string) => void;
}

export function ItineraryListDrawer({ open, onClose, onSelect }: ItineraryListDrawerProps) {
  const store = useItineraryStore();
  const [summaries, setSummaries] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    store.listSummaries()
      .then(setSummaries)
      .catch(() => setError('加载失败，请重试'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--smart-border, #e5e7eb)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--smart-text, #111827)' }}>
            我的行程
          </h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 20,
              lineHeight: 1,
              color: 'var(--smart-text-soft, #6b7280)',
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--smart-text-soft, #6b7280)' }}>
              <div style={{ fontSize: 14 }}>加载中...</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          )}

          {!loading && !error && summaries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--smart-text-soft, #6b7280)', fontSize: 14, lineHeight: 1.6 }}>
              暂无保存的行程，快去规划你的第一次旅行吧！
            </div>
          )}

          {!loading && !error && summaries.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summaries.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onSelect?.(item.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: 'var(--smart-surface-soft, #f9fafb)',
                      border: '1px solid var(--smart-border, #e5e7eb)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: onSelect ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (onSelect) (e.currentTarget as HTMLButtonElement).style.background = 'color-mix(in srgb, var(--smart-primary, #6366f1) 8%, white)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--smart-surface-soft, #f9fafb)';
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--smart-text, #111827)', marginBottom: 4 }}>
                      {item.destination}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--smart-text-soft, #6b7280)', display: 'flex', gap: 12 }}>
                      <span>{item.totalDays} 天</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
