import { useState, useEffect } from 'react';
import { CITIES } from '../data/cities';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';

interface RandomDrawProps {
  onSelectCity: (city: string) => void;
}

export function RandomDraw({ onSelectCity }: RandomDrawProps) {
  const [step, setStep] = useState<'create' | 'join' | 'room'>('create');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [myCities, setMyCities] = useState<string[]>(['']);

  const {
    isConnected,
    room,
    error,
    drawRollingCity,
    createRoom,
    joinRoom,
    leaveRoom,
    submitDrawSelection,
  } = useGroupDecision();

  // 当成功创建或加入房间后，进入房间页面
  useEffect(() => {
    if (room) {
      setStep('room');
    }
  }, [room]);

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      alert('请输入您的昵称');
      return;
    }
    createRoom('draw', userName);
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      alert('请输入您的昵称');
      return;
    }
    if (!roomId.trim()) {
      alert('请输入房间码');
      return;
    }
    joinRoom(roomId, userName);
  };

  const handleConfirmSelection = () => {
    const validCities = myCities.filter(c => c.trim());
    if (validCities.length === 0) {
      alert('请至少输入一个城市');
      return;
    }
    submitDrawSelection(validCities);
  };

  const handleLeave = () => {
    leaveRoom();
    setStep('create');
    setRoomId('');
    setMyCities(['']);
  };

  // 添加城市输入框
  const addCityInput = () => {
    if (myCities.length < 3) {
      setMyCities([...myCities, '']);
    }
  };

  // 更新城市
  const updateCity = (index: number, value: string) => {
    const newCities = [...myCities];
    newCities[index] = value;
    setMyCities(newCities);
  };

  // 获取确认进度
  const getConfirmProgress = () => {
    if (!room) return { confirmed: 0, total: 0 };
    const participants = Object.values(room.participants);
    return {
      confirmed: participants.filter((p: Participant) => p.confirmed).length,
      total: participants.length,
    };
  };

  const progress = getConfirmProgress();
  const isDrawing = room?.status === 'drawing';
  const drawResult = room?.result;

  if (step === 'create') {
    return (
      <div className="space-y-6 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <input
            type="text"
            placeholder="输入您的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleCreateRoom}
            disabled={!isConnected}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300"
          >
            {isConnected ? '创建抽签房间' : '连接中...'}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或</span>
            </div>
          </div>
          <button
            onClick={() => setStep('join')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            加入已有房间
          </button>
        </div>
      </div>
    );
  }

  if (step === 'join') {
    return (
      <div className="space-y-6 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <input
            type="text"
            placeholder="输入您的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="text"
            placeholder="输入房间码（如：ABC123）"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!isConnected}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300"
          >
            {isConnected ? '加入房间' : '连接中...'}
          </button>
          <button
            onClick={() => setStep('create')}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            返回创建房间
          </button>
        </div>
      </div>
    );
  }

  // 房间内页面 - 找到当前用户（通过匹配用户名，因为Socket.io的ID每次连接都不同）
  const me = room ? Object.values(room.participants).find((p: Participant) => p.name === userName) : null;
  const allConfirmed = progress.total >= 2 && progress.confirmed === progress.total;

  return (
    <div className="space-y-6">
      {/* 房间信息 */}
      <div className="text-center">
        <p className="text-sm text-gray-500">房间码</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-2xl font-bold text-primary-600 tracking-wider">{room?.roomId}</p>
          <button
            onClick={() => {
              if (room?.roomId) {
                navigator.clipboard.writeText(room.roomId);
                alert('房间码已复制到剪贴板');
              }
            }}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="复制房间码"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">分享给好友，一起参与抽签</p>
      </div>

      {/* 确认进度 */}
      <div className="flex justify-center items-center gap-2">
        <span className="text-sm text-gray-600">确认进度：</span>
        <span className={`font-medium ${allConfirmed ? 'text-green-600' : 'text-primary-600'}`}>
          {progress.confirmed}/{progress.total}
        </span>
        {allConfirmed && <span className="text-green-600 text-sm">✓ 全员确认，自动开奖中...</span>}
      </div>

      {/* 参与者列表 */}
      <div className="space-y-2">
        {room && Object.values(room.participants).map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">{p.name} {p.name === userName ? '(我)' : ''}</span>
            <span className={`text-sm ${p.confirmed ? 'text-green-600' : 'text-gray-400'}`}>
              {p.confirmed ? `已确认 (${(p.cities || []).length}个城市)` : '待确认'}
            </span>
          </div>
        ))}
      </div>

      {/* 我的选择区 */}
      {!me?.confirmed && room?.status !== 'finished' && (
        <div className="p-4 bg-primary-50 rounded-xl space-y-4">
          <h4 className="font-medium text-primary-900">我的心仪城市（1-3个）</h4>
          {myCities.map((city, index) => (
            <input
              key={index}
              type="text"
              placeholder={`城市${index + 1}`}
              value={city}
              onChange={(e) => updateCity(index, e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              list="city-suggestions"
            />
          ))}
          {myCities.length < 3 && (
            <button
              onClick={addCityInput}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              + 添加城市
            </button>
          )}
          <button
            onClick={handleConfirmSelection}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
          >
            确认选择
          </button>
        </div>
      )}

      {/* 抽签结果 */}
      {(isDrawing || drawResult || drawRollingCity) && (
        <div className="text-center p-6 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl">
          <p className="text-sm text-gray-600 mb-2">
            {isDrawing ? '抽签中...' : '抽签结果'}
          </p>
          <p className={`text-4xl font-bold ${isDrawing ? 'animate-pulse text-primary-600' : 'text-primary-700'}`}>
            {drawRollingCity || drawResult || '...'}
          </p>
          {!isDrawing && drawResult && (
            <button
              onClick={() => onSelectCity(drawResult)}
              className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              用此城市生成行程
            </button>
          )}
        </div>
      )}

      {/* 连接状态 */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      {/* 离开按钮 */}
      <div className="text-center pt-4 border-t">
        <button
          onClick={handleLeave}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          离开房间
        </button>
      </div>

      <datalist id="city-suggestions">
        {CITIES.map(city => (
          <option key={city.name} value={city.name} />
        ))}
      </datalist>
    </div>
  );
}