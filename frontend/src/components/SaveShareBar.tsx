import { useState } from 'react';
import type { Itinerary } from '../types/itinerary';
import { useItineraryStore } from '../hooks/useItineraryStore';

interface SaveShareBarProps {
  itinerary: Itinerary;
  readOnly?: boolean;
  /** 紧凑模式：只显示保存/已保存按钮，适合放在工具栏 */
  compact?: boolean;
}

export function SaveShareBar({ itinerary, readOnly, compact }: SaveShareBarProps) {
  if (readOnly) return null;

  const store = useItineraryStore();

  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await store.save(itinerary);
      setSavedId(result.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('上限')) {
        setError('已达保存上限，请删除旧行程后重试');
      } else {
        setError('保存失败，请重试');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!savedId) return;
    setSharing(true);
    setCopied(false);
    try {
      const link = await store.getShare(savedId);
      setShareLink(link);
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        setShowFallbackModal(true);
      }
    } catch {
      setError('获取分享链接失败，请重试');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-2 mt-4'}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={saving || savedId !== null}
          className={`rounded-lg text-sm font-medium transition-colors ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
          style={{
            background: savedId ? 'var(--smart-surface-soft, #f3f4f6)' : 'var(--smart-primary, #6366f1)',
            color: savedId ? 'var(--smart-text-soft, #6b7280)' : '#fff',
            cursor: saving || savedId !== null ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? '保存中...' : savedId ? '✓ 已保存' : '保存行程'}
        </button>

        {/* 分享按钮：仅保存成功后显示 */}
        {savedId && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className={`rounded-lg text-sm font-medium transition-colors ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
            style={{
              background: 'var(--smart-primary, #6366f1)',
              color: '#fff',
              cursor: sharing ? 'not-allowed' : 'pointer',
              opacity: sharing ? 0.7 : 1,
            }}
          >
            {sharing ? '生成中...' : copied ? '链接已复制 ✓' : '分享行程'}
          </button>
        )}
      </div>

      {/* 登录引导（保存成功后显示，非紧凑模式） */}
      {savedId && !compact && (
        <p className="text-xs" style={{ color: 'var(--smart-text-soft, #6b7280)' }}>
          登录后可跨设备访问行程{' '}
          <button
            className="underline"
            style={{ color: 'var(--smart-primary, #6366f1)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => {/* TODO: open login */}}
          >
            立即登录
          </button>
        </p>
      )}

      {/* 错误提示 */}
      {error && !compact && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}

      {/* 复制成功提示 */}
      {copied && !compact && (
        <p className="text-xs" style={{ color: '#22c55e' }}>链接已复制</p>
      )}

      {/* 剪贴板不可用时的 fallback 弹窗 */}
      {showFallbackModal && shareLink && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setShowFallbackModal(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 12, padding: '24px', maxWidth: 400, width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>分享链接</h4>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>请手动复制以下链接：</p>
            <input
              readOnly
              value={shareLink}
              onFocus={e => e.target.select()}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setShowFallbackModal(false)}
              style={{
                marginTop: 16, width: '100%', padding: '8px', borderRadius: 8,
                background: 'var(--smart-primary, #6366f1)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
