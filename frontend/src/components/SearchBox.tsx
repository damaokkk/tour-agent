import { useState } from 'react';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const SUGGESTIONS = [
  '预算5000去上海玩3天，必去迪士尼和外滩',
  '北京5日游，喜欢历史文化，预算8000',
  '成都3天2晚，想吃火锅和看大熊猫',
  '杭州西湖2日游，预算3000，喜欢拍照',
];

export function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  const [query, setQuery] = useState('');

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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          SmartTour
        </h1>
        <p className="text-lg text-gray-600">
          智能旅游规划助手，为您定制完美行程
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="描述您的旅行需求，例如：预算5000去上海玩3天..."
            className="w-full px-4 md:px-6 py-3 md:py-4 text-lg border-2 border-gray-200 rounded-2xl 
                       focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100
                       transition-all duration-200 shadow-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2
                       px-3 md:px-6 py-1.5 md:py-2 text-sm md:text-base bg-primary-600 text-white rounded-xl
                       hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors duration-200 font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                规划中
              </span>
            ) : (
              '开始规划'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-sm text-gray-500 mb-3">试试这些示例：</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-3 md:px-4 py-1.5 md:py-2 text-sm bg-white border border-gray-200 rounded-full
                         hover:border-primary-300 hover:bg-primary-50
                         transition-colors duration-200 text-gray-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
