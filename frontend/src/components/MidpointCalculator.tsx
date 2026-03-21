import { useState, useEffect, useCallback } from 'react';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';

interface MidpointCalculatorProps {
  onSelectCity: (city: string) => void;
}

// 百度地图逆地理编码
const getAddressFromLocation = (lat: number, lng: number): Promise<string> => {
  return new Promise((resolve) => {
    if (!(window as any).BMap) {
      resolve('未知位置');
      return;
    }
    
    const BMap = (window as any).BMap;
    const geoc = new BMap.Geocoder();
    const point = new BMap.Point(lng, lat);
    
    geoc.getLocation(point, (result: any) => {
      if (result && result.address) {
        const address = result.address;
        const surroundingPois = result.surroundingPois;
        if (surroundingPois && surroundingPois.length > 0) {
          resolve(`${address} (${surroundingPois[0].title})`);
        } else {
          resolve(address);
        }
      } else {
        resolve('未知位置');
      }
    });
  });
};

export function MidpointCalculator({ onSelectCity }: MidpointCalculatorProps) {
  const [step, setStep] = useState<'create' | 'join' | 'room'>('create');
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSubmittedLocation, setHasSubmittedLocation] = useState(false);

  const {
    isConnected,
    room,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateLocation,
    calculateMidpoint,
  } = useGroupDecision();

  // 当成功创建或加入房间后，进入房间页面
  useEffect(() => {
    if (room) {
      setStep('room');
    }
  }, [room]);

  // 检查当前用户是否已提交位置
  useEffect(() => {
    if (room) {
      const myParticipant = Object.values(room.participants).find(
        (p: Participant) => p.location !== undefined
      );
      setHasSubmittedLocation(!!myParticipant?.location);
    }
  }, [room]);

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      alert('请输入您的昵称');
      return;
    }
    createRoom('midpoint', userName);
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

  const handleGetLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    const getPosition = (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
        // 优先使用百度地图定位
        if ((window as any).BMap && (window as any).BMap.Geolocation) {
          const BMap = (window as any).BMap;
          const geolocation = new BMap.Geolocation();
          
          geolocation.getCurrentPosition(
            (result: any) => {
              if (geolocation.getStatus() === 0) {
                resolve({ lat: result.point.lat, lng: result.point.lng });
              } else {
                reject(new Error('百度定位失败'));
              }
            },
            { enableHighAccuracy: true }
          );
        } else {
          // 浏览器原生定位
          if (!navigator.geolocation) {
            reject(new Error('浏览器不支持定位'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      });
    };

    try {
      const { lat, lng } = await getPosition();
      const address = await getAddressFromLocation(lat, lng);
      updateLocation(lat, lng, address);
      setHasSubmittedLocation(true);
    } catch (err: any) {
      setLocationError('定位失败，请检查定位权限');
    } finally {
      setIsLocating(false);
    }
  }, [updateLocation]);

  const handleCalculate = () => {
    if (!room) return;
    const participantsWithLocation = Object.values(room.participants).filter(
      (p: Participant) => p.location
    );
    if (participantsWithLocation.length < 2) {
      alert('至少需要2人提交位置才能计算');
      return;
    }
    calculateMidpoint();
  };

  const handleSelectCity = (cityName: string) => {
    if (confirm(`确定选择 "${cityName}" 作为旅游目的地吗？`)) {
      onSelectCity(cityName);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setStep('create');
    setRoomId('');
    setHasSubmittedLocation(false);
  };

  // 获取参与者列表（按加入时间排序）
  const getSortedParticipants = (): Participant[] => {
    if (!room) return [];
    return Object.values(room.participants).sort(
      (a, b) => a.joinedAt - b.joinedAt
    );
  };

  // 获取已提交位置的参与者数量
  const getLocationCount = (): number => {
    if (!room) return 0;
    return Object.values(room.participants).filter(
      (p: Participant) => p.location
    ).length;
  };

  // 创建/加入房间页面
  if (step === 'create') {
    return (
      <div className="space-y-6 text-center">
        <div className="text-gray-600 mb-6">
          <p>创建一个房间，邀请好友加入</p>
          <p className="text-sm text-gray-500 mt-1">所有人实时提交位置，自动计算最佳会合点</p>
        </div>

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
            {isConnected ? '创建房间' : '连接中...'}
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

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  // 加入房间页面
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

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  // 房间内页面
  const participants = getSortedParticipants();
  const locationCount = getLocationCount();
  const totalParticipants = participants.length;

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
        <p className="text-sm text-gray-500 mt-1">分享给好友，一起参与</p>
      </div>

      {/* 连接状态 */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          {isConnected ? '已连接' : '未连接'}
        </span>
      </div>

      {/* 位置提交进度 */}
      <div className="flex justify-center items-center gap-2">
        <span className="text-sm text-gray-600">位置提交：</span>
        <span className="font-medium text-primary-600">
          {locationCount}/{totalParticipants}
        </span>
        {locationCount >= 2 && (
          <span className="text-green-600 text-sm">✓ 可以计算中点了</span>
        )}
      </div>

      {/* 参与者列表 */}
      <div className="space-y-2">
        {participants.map((p, index) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <span className="font-medium">{p.name}</span>
            </div>
            <span className={`text-sm ${p.location ? 'text-green-600' : 'text-gray-400'}`}>
              {p.location ? `已提交 (${p.location.address?.slice(0, 10)}...)` : '待提交位置'}
            </span>
          </div>
        ))}
      </div>

      {/* 获取位置按钮 */}
      {!hasSubmittedLocation && room?.status !== 'finished' && (
        <div className="text-center">
          <button
            onClick={handleGetLocation}
            disabled={isLocating}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300"
          >
            {isLocating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                定位中...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                提交我的位置
              </span>
            )}
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {locationError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
          {locationError}
        </div>
      )}

      {/* 计算按钮 */}
      {locationCount >= 2 && room?.status !== 'finished' && (
        <div className="text-center">
          <button
            onClick={handleCalculate}
            disabled={room?.status === 'calculating'}
            className="px-8 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300"
          >
            {room?.status === 'calculating' ? '计算中...' : '计算最佳会合点'}
          </button>
        </div>
      )}

      {/* 结果展示 */}
      {room?.result && (
        <div className="mt-8 p-6 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">推荐会合城市</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {room.result.recommendations?.map((city: any, index: number) => (
              <div
                key={city.name}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-primary-300 cursor-pointer transition-all"
                onClick={() => handleSelectCity(city.name)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{city.name}</p>
                    <p className="text-sm text-gray-500">{city.province}</p>
                    <p className="text-xs text-primary-600 mt-1">距离: {city.distance}km</p>
                  </div>
                  {index === 0 && (
                    <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                      最佳
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            点击城市卡片可填入搜索框生成行程
          </p>
        </div>
      )}

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