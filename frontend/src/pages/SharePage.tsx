import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Itinerary } from '../types/itinerary';
import { ItineraryCard } from '../components/ItineraryCard';

interface SharedItinerary {
  id: string;
  destination: string;
  totalDays: number;
  content: Itinerary;
  createdAt: string;
}

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    fetch(`/api/v1/itinerary/share/${token}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-5xl">🗺️</p>
          <h1 className="text-xl font-semibold text-gray-700">行程不存在或链接已失效</h1>
          <Link to="/" className="inline-block mt-2 px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
            返回主页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--smart-bg-bottom, #f8fafc)' }}>
      {/* Page header */}
      <div className="w-full py-4 px-4 flex items-center justify-between max-w-4xl mx-auto">
        <span className="text-sm text-gray-400">由 SmartTour 生成</span>
        <Link
          to="/"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ background: 'var(--smart-primary, #3b82f6)' }}
        >
          立即规划我的行程
        </Link>
      </div>

      {/* Itinerary content */}
      <div className="px-4 pb-12">
        <ItineraryCard itinerary={data.content} />
      </div>
    </div>
  );
}
