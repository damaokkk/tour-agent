import { useState, useEffect } from 'react';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  onAbort?: () => void;
  isLoading: boolean;
  defaultQuery?: string;
  defaultQueryVersion?: number;
  hideSuggestions?: boolean;
}

const SUGGESTIONS = [
  '预算5000去上海玩3天，必去迪士尼和外滩',
  '北京5日游，喜欢历史文化，预算8000',
  '成都3天2晚，想吃火锅和看大熊猫',
  '杭州西湖2日游，预算3000，喜欢拍照',
];

export function SearchBox({ onSearch, onAbort, isLoading, defaultQuery, defaultQueryVersion, hideSuggestions }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (typeof defaultQuery === 'string') {
      setQuery(defaultQuery);
    }
  }, [defaultQuery, defaultQueryVersion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
  };

  const handleAbort = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAbort) onAbort();
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in-up">
      <form onSubmit={handleSubmit}>
        {/* 输入框 */}
        <div className="smart-card p-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：预算5000去上海玩3天"
            className="smart-input flex-1 border-0 bg-transparent shadow-none focus:ring-0 focus:border-transparent px-3 py-2"
            style={{ boxShadow: 'none' }}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={handleAbort}
              className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
              style={{ background: 'var(--smart-danger-text)' }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              终止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!query.trim()}
              className="smart-main-btn shrink-0 px-6 py-2.5 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              开始规划
            </button>
          )}
        </div>
      </form>

      {/* 示例建议 */}
      {!hideSuggestions && (
      <div className="mt-4 px-1">
        <p className="smart-text-soft text-xs mb-2.5">试试这些示例：</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="smart-outline-btn px-3 py-1.5 text-xs rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
