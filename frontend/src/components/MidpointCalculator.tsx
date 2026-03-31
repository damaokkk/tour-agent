import { useState, useEffect, useCallback } from 'react';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';

interface MidpointCalculatorProps {
  onSelectCity: (city: string) => void;
}

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

const parseCoordinateInput = (input: string): { lat: number; lng: number } | null => {
  const matched = input.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*[,，\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!matched) return null;

  const lat = Number(matched[1]);
  const lng = Number(matched[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
};

const geocodeAddress = (keyword: string): Promise<{ lat: number; lng: number; address: string } | null> => {
  return new Promise((resolve) => {
    const parsed = parseCoordinateInput(keyword);
    if (parsed) {
      resolve({ ...parsed, address: `手动输入坐标 (${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)})` });
      return;
    }

    if (!(window as any).BMap) {
      resolve(null);
      return;
    }

    const BMap = (window as any).BMap;
    const geoc = new BMap.Geocoder();
    geoc.getPoint(keyword, (point: any) => {
      if (!point) {
        resolve(null);
        return;
      }
      resolve({ lat: point.lat, lng: point.lng, address: keyword });
    });
  });
};

export function MidpointCalculator({ onSelectCity }: MidpointCalculatorProps) {
  const [step, setStep] = useState<'create' | 'join' | 'room'>('create');
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isManualResolving, setIsManualResolving] = useState(false);
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasSubmittedLocation, setHasSubmittedLocation] = useState(false);

  const {
    isConnected,
    room,
    error,
    selfId,
    createRoom,
    joinRoom,
    leaveRoom,
    updateLocation,
    calculateMidpoint,
  } = useGroupDecision('midpoint');

  useEffect(() => {
    if (room) setStep('room');
  }, [room]);

  useEffect(() => {
    if (!room || !selfId) {
      setHasSubmittedLocation(false);
      return;
    }

    const myParticipant = room.participants[selfId] as Participant | undefined;
    setHasSubmittedLocation(!!myParticipant?.location);
  }, [room, selfId]);

  const participants = room ? Object.values(room.participants).sort((a, b) => a.joinedAt - b.joinedAt) : [];
  const locationCount = participants.filter((p: Participant) => p.location).length;
  const totalParticipants = participants.length;
  const isHost = !!(room && selfId && room.hostId === selfId);

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      alert('请输入您的昵称');
      return;
    }
    createRoom('midpoint', userName.trim());
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
    joinRoom(roomId, userName.trim());
  };

  const handleGetLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    const getPosition = (): Promise<{ lat: number; lng: number }> => {
      return new Promise((resolve, reject) => {
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
            { enableHighAccuracy: true },
          );
        } else {
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
            { enableHighAccuracy: true, timeout: 10000 },
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
      console.error(err);
      setLocationError('定位失败，请检查定位权限');
    } finally {
      setIsLocating(false);
    }
  }, [updateLocation]);

  const handleManualSubmit = useCallback(async () => {
    const keyword = manualLocationInput.trim();
    if (!keyword) {
      setLocationError('请输入位置关键词或经纬度');
      return;
    }

    setIsManualResolving(true);
    setLocationError(null);

    try {
      const result = await geocodeAddress(keyword);
      if (!result) {
        setLocationError('未识别到该位置，请输入更具体地址，或使用“纬度,经度”格式');
        return;
      }

      updateLocation(result.lat, result.lng, result.address);
      setHasSubmittedLocation(true);
    } catch (err) {
      console.error(err);
      setLocationError('手动位置解析失败，请稍后再试');
    } finally {
      setIsManualResolving(false);
    }
  }, [manualLocationInput, updateLocation]);

  const handleCalculate = () => {
    if (locationCount < 2) {
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
    setManualLocationInput('');
    setHasSubmittedLocation(false);
    setLocationError(null);
  };

  const renderOnboarding = (isJoin: boolean) => (
    <div className="mx-auto max-w-md space-y-4">
      <div className="smart-card-inner p-5 md:p-6">
        <h3 className="smart-text-strong mb-3 text-center text-xl font-semibold">{isJoin ? '加入中点房间' : '创建中点房间'}</h3>
        <p className="smart-text-muted mb-5 text-center text-sm">
          {isJoin ? '输入昵称与房间号，进入实时位置汇总面板' : '创建房间后分享房间码，所有人提交位置后计算最佳会合点'}
        </p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="输入您的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="smart-input"
          />
          {isJoin && (
            <input
              type="text"
              placeholder="输入房间码（如：PCNHB1）"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              className="smart-input"
            />
          )}
          <button
            onClick={isJoin ? handleJoinRoom : handleCreateRoom}
            disabled={!isConnected}
            className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isConnected ? (isJoin ? '加入房间' : '创建房间') : '连接中...'}
          </button>
          <button onClick={() => setStep(isJoin ? 'create' : 'join')} className="smart-outline-btn w-full rounded-2xl">
            {isJoin ? '返回创建房间' : '加入已有房间'}
          </button>
        </div>
      </div>
      {error && <div className="smart-error-card">{error}</div>}
    </div>
  );

  if (step === 'create') return renderOnboarding(false);
  if (step === 'join') return renderOnboarding(true);

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="smart-header-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="smart-text-muted text-sm">房间号</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="smart-text-strong text-3xl font-semibold tracking-widest">{room?.roomId}</p>
              <button
                onClick={() => {
                  if (room?.roomId) {
                    navigator.clipboard.writeText(room.roomId);
                    alert('房间码已复制到剪贴板');
                  }
                }}
                className="smart-outline-btn px-3 py-1.5 text-sm"
                title="复制房间码"
              >
                复制
              </button>
            </div>
            <div className="smart-text-muted mt-2 flex items-center gap-2 text-xs">
              <span className={`smart-status-pill ${isConnected ? 'smart-status-ok' : 'smart-status-danger'}`}>
                {isConnected ? '已连接' : '未连接'}
              </span>
              {isHost && <span className="smart-status-pill smart-status-host">您是房主</span>}
            </div>
          </div>

          <div className="w-full max-w-[260px]">
            <div className="smart-text-muted mb-1 flex items-center justify-between">
              <span className="text-sm">位置提交进度</span>
              <span className="text-xl font-semibold">{locationCount}/{totalParticipants}</span>
            </div>
            <div className="smart-progress-track">
              <div
                className="smart-progress-fill"
                style={{ width: `${totalParticipants === 0 ? 0 : (locationCount / totalParticipants) * 100}%` }}
              />
            </div>
            {locationCount >= 2 && <p className="text-xs mt-1 text-[var(--smart-success-text)]">已满足中点计算条件</p>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <section className="smart-card p-4 md:p-5 flex flex-col">
          <h4 className="smart-text-strong mb-3 text-3xl font-semibold tracking-tight">参与者位置状态</h4>
          <div className="space-y-2 flex-1 max-h-[320px] overflow-y-auto pr-1">
            {participants.map((p, index) => (
              <div key={p.id} className="smart-panel-soft rounded-2xl p-3">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="smart-status-pill smart-status-host min-w-6 text-center">{index + 1}</span>
                    <p className="smart-text-strong text-base font-medium">
                      {p.name}{p.id === selfId ? '（我）' : ''}{room?.hostId === p.id ? '（房主）' : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${p.location ? 'text-[var(--smart-success-text)]' : 'smart-text-soft'}`}>
                    {p.location ? '已提交' : '待提交位置'}
                  </span>
                </div>
                <p className="smart-text-muted text-sm">
                  {p.location?.address ? `位置：${p.location.address}` : '等待该成员提交定位信息'}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="smart-card p-4 md:p-5 flex flex-col">
          <h4 className="smart-text-strong mb-3 text-3xl font-semibold tracking-tight">中点计算控制</h4>
          <p className="smart-text-muted text-sm mb-3">提交当前位置后，至少 2 人可计算最佳会合城市。</p>

          {!hasSubmittedLocation && room?.status !== 'finished' && (
            <div className="space-y-3">
              <button
                onClick={handleGetLocation}
                disabled={isLocating || isManualResolving}
                className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLocating ? '定位中...' : '使用定位提交我的位置'}
              </button>

              <div className="smart-panel-soft rounded-2xl p-3 space-y-2">
                <p className="smart-text-muted text-xs">手动输入位置（支持“北京朝阳区”或“39.9042,116.4074”）</p>
                <input
                  type="text"
                  value={manualLocationInput}
                  onChange={(e) => setManualLocationInput(e.target.value)}
                  placeholder="输入地址关键词或经纬度"
                  className="smart-input"
                />
                <button
                  onClick={handleManualSubmit}
                  disabled={isLocating || isManualResolving || !manualLocationInput.trim()}
                  className="smart-outline-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isManualResolving ? '解析中...' : '手动位置提交'}
                </button>
              </div>
            </div>
          )}

          {hasSubmittedLocation && room?.status !== 'finished' && (
            <p className="smart-success-note rounded-xl px-3 py-2 text-sm">您的位置已提交，可等待他人提交或直接计算。</p>
          )}

          {locationCount >= 2 && room?.status !== 'finished' && (
            <button
              onClick={handleCalculate}
              disabled={room?.status === 'calculating'}
              className="smart-main-btn w-full mt-3 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {room?.status === 'calculating' ? '计算中...' : '计算最佳会合点'}
            </button>
          )}

          {locationError && <div className="smart-error-card mt-3">{locationError}</div>}
        </section>
      </div>

      {room?.result && (
        <section className="smart-result-shell rounded-2xl p-5 md:p-6">
          <h3 className="smart-text-strong text-2xl font-semibold mb-4">推荐会合城市</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {room.result.recommendations?.map((city: any, index: number) => (
              <button
                key={city.name}
                onClick={() => handleSelectCity(city.name)}
                className="smart-recommend-card rounded-xl p-4 text-left cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="smart-text-strong font-semibold">{city.name}</p>
                    <p className="smart-text-muted text-sm">{city.province}</p>
                    <p className="text-xs mt-1 text-[var(--smart-success-text)]">距离: {city.distance}km</p>
                  </div>
                  {index === 0 && <span className="smart-status-pill smart-status-host">最佳</span>}
                </div>
              </button>
            ))}
          </div>
          <p className="smart-text-muted text-center text-sm mt-4">点击城市卡片可填入搜索框生成行程</p>
        </section>
      )}

      {error && <div className="smart-error-card">{error}</div>}

      <div className="pt-1 text-center">
        <button onClick={handleLeave} className="smart-text-muted text-sm transition hover:text-[var(--smart-text-strong)]">离开房间</button>
      </div>
    </div>
  );
}
