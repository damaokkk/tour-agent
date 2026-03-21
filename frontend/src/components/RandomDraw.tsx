import { useState, useEffect } from 'react';
import { CITIES, getHotCities, getProvinces, getCitiesByProvince, type City } from '../data/cities';
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
        <CitySelector 
          selectedCities={myCities}
          onChange={setMyCities}
          onConfirm={handleConfirmSelection}
        />
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

    </div>
  );
}

// 城市选择器组件
interface CitySelectorProps {
  selectedCities: string[];
  onChange: (cities: string[]) => void;
  onConfirm: () => void;
}

function CitySelector({ selectedCities, onChange, onConfirm }: CitySelectorProps) {
  const [activeTab, setActiveTab] = useState<'hot' | 'province'>('hot');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [showSelector, setShowSelector] = useState(false);

  const hotCities = getHotCities();
  const provinces = getProvinces();
  const citiesInProvince = selectedProvince ? getCitiesByProvince(selectedProvince) : [];

  // 添加城市到选择列表
  const addCity = (cityName: string) => {
    const emptyIndex = selectedCities.findIndex(c => !c.trim());
    if (emptyIndex !== -1) {
      // 替换第一个空位
      const newCities = [...selectedCities];
      newCities[emptyIndex] = cityName;
      onChange(newCities);
    } else if (selectedCities.length < 3) {
      // 添加新城市
      onChange([...selectedCities, cityName]);
    }
    setShowSelector(false);
  };

  // 移除已选城市
  const removeCity = (index: number) => {
    const newCities = selectedCities.filter((_, i) => i !== index);
    // 确保至少有一个输入框
    if (newCities.length === 0) {
      newCities.push('');
    }
    onChange(newCities);
  };

  // 更新城市输入
  const updateCityInput = (index: number, value: string) => {
    const newCities = [...selectedCities];
    newCities[index] = value;
    onChange(newCities);
  };

  // 添加空输入框
  const addEmptyInput = () => {
    if (selectedCities.length < 3) {
      onChange([...selectedCities, '']);
    }
  };

  const validCities = selectedCities.filter(c => c.trim());

  return (
    <div className="p-4 bg-primary-50 rounded-xl space-y-4">
      <h4 className="font-medium text-primary-900">我的心仪城市（1-3个）</h4>
      
      {/* 已选城市展示 */}
      <div className="space-y-2">
        {selectedCities.map((city, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`城市${index + 1}`}
              value={city}
              onChange={(e) => updateCityInput(index, e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              readOnly={!!city.trim()}
            />
            {city.trim() ? (
              <button
                onClick={() => removeCity(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="移除"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setShowSelector(true)}
                className="p-2 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                title="选择城市"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      {selectedCities.length < 3 && selectedCities.every(c => c.trim()) && (
        <button
          onClick={addEmptyInput}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加城市
        </button>
      )}

      {/* 城市选择弹窗 */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">选择城市</h3>
              <button
                onClick={() => setShowSelector(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 标签切换 */}
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('hot')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'hot'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                热门城市
              </button>
              <button
                onClick={() => setActiveTab('province')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'province'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                按省份选择
              </button>
            </div>

            {/* 城市列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'hot' ? (
                // 热门城市网格
                <div className="grid grid-cols-3 gap-2">
                  {hotCities.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => addCity(city.name)}
                      disabled={selectedCities.includes(city.name)}
                      className={`p-3 text-sm rounded-lg border transition-colors ${
                        selectedCities.includes(city.name)
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary-500 hover:text-primary-600'
                      }`}
                    >
                      {city.name.replace('市', '')}
                    </button>
                  ))}
                </div>
              ) : (
                // 省份级联选择
                <div className="space-y-4">
                  {/* 省份选择 */}
                  {!selectedProvince ? (
                    <div className="grid grid-cols-3 gap-2">
                      {provinces.map((province) => (
                        <button
                          key={province}
                          onClick={() => setSelectedProvince(province)}
                          className="p-3 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-primary-500 hover:text-primary-600 transition-colors"
                        >
                          {province}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // 城市选择
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedProvince('')}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          返回省份列表
                        </button>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm font-medium text-gray-900">{selectedProvince}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {citiesInProvince.map((city) => (
                          <button
                            key={city.name}
                            onClick={() => addCity(city.name)}
                            disabled={selectedCities.includes(city.name)}
                            className={`p-3 text-sm rounded-lg border transition-colors ${
                              selectedCities.includes(city.name)
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-primary-500 hover:text-primary-600'
                            }`}
                          >
                            {city.name.replace('市', '').replace('土家族苗族自治州', '').replace('藏族自治州', '').replace('彝族自治州', '').replace('傣族自治州', '').replace('白族自治州', '').replace('朝鲜族自治州', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 确认按钮 */}
      <button
        onClick={onConfirm}
        disabled={validCities.length === 0}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        确认选择 ({validCities.length}/3)
      </button>
    </div>
  );
}