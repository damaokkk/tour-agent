import { useState, useEffect, useCallback } from 'react';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';
import BottomSheet from './ui/BottomSheet';
import Modal from './ui/Modal';

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
  const [modalType, setModalType] = useState<'create' | 'join' | null>(null);
  const [modalError, setModalError] = useState('');
  const [manualInputOpen, setManualInputOpen] = useState(false);

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
    if (room) {
      setStep('room');
      setModalType(null);
    }
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
      setModalError('请输入您的昵称');
      return;
    }
    setModalError('');
    createRoom('midpoint', userName.trim());
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setModalError('请输入您的昵称');
      return;
    }
    if (!roomId.trim()) {
      setModalError('请输入房间码');
      return;
    }
    setModalError('');
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
        setLocationError('未识别到该位置，请输入更具体地址，或使用"纬度,经度"格式');
        return;
      }

      updateLocation(result.lat, result.lng, result.address);
      setHasSubmittedLocation(true);
      setManualInputOpen(false);
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

  const openModal = (type: 'create' | 'join') => {
    setModalError('');
    setModalType(type);
  };

  // 主界面（create/join 步骤时显示入口按钮）
  if (step === 'create' || step === 'join') {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <div className="smart-card-inner p-5 md:p-6">
          <h3 className="smart-text-strong mb-3 text-center text-xl font-semibold">智能中点</h3>
          <p className="smart-text-muted mb-5 text-center text-sm">
            创建房间后分享房间码，所有人提交位置后计算最佳会合点
          </p>
          <div className="space-y-3">
            <button
              onClick={() => openModal('create')}
              disabled={!isConnected}
              className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnected ? '创建房间' : '连接中...'}
            </button>
            <button
              onClick={() => openModal('join')}
              disabled={!isConnected}
              className="smart-outline-btn w-full rounded-2xl disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnected ? '加入房间' : '连接中...'}
            </button>
          </div>
        </div>
        {error && <div className="smart-error-card">{error}</div>}

        {/* 创建/加入 Modal */}
        <Modal
          isOpen={modalType !== null}
          onClose={() => { setModalType(null); setModalError(''); }}
          title={modalType === 'join' ? '加入中点房间' : '创建中点房间'}
        >
          <div className="space-y-3">
            <p className="smart-text-muted text-sm">
              {modalType === 'join'
                ? '输入昵称与房间号，进入实时位置汇总面板'
                : '创建房间后分享房间码，所有人提交位置后计算最佳会合点'}
            </p>
            <input
              type="text"
              placeholder="输入您的昵称"
              value={userName}
              onChange={(e) => { setUserName(e.target.value); setModalError(''); }}
              className="smart-input"
            />
            {modalType === 'join' && (
              <input
                type="text"
                placeholder="输入房间码（如：PCNHB1）"
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setModalError(''); }}
                className="smart-input"
              />
            )}
            {modalError && <p className="text-red-500 text-sm">{modalError}</p>}
            <button
              onClick={modalType === 'join' ? handleJoinRoom : handleCreateRoom}
              disabled={!isConnected}
              className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isConnected ? (modalType === 'join' ? '加入房间' : '创建房间') : '连接中...'}
            </button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="smart-header-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* 房间号 */}
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <p className="smart-text-muted text-xs mb-0.5">房间号</p>
              <div className="flex items-center gap-2">
                <p className="smart-text-strong text-2xl font-bold tracking-widest">{room?.roomId}</p>
                <button
                  onClick={() => {
                    if (room?.roomId) {
                      navigator.clipboard.writeText(room.roomId);
                      alert('房间码已复制到剪贴板');
                    }
                  }}
                  className="smart-outline-btn px-2.5 py-1 text-xs"
                  title="复制房间码"
                >
                  复制
                </button>
              </div>
            </div>
          </div>

          {/* 状态标签 */}
          <div className="flex items-center gap-2">
            <span className={`smart-status-pill ${isConnected ? 'smart-status-ok' : 'smart-status-danger'}`}>
              {isConnected ? '已连接' : '未连接'}
            </span>
            {isHost && <span className="smart-status-pill smart-status-host">您是房主</span>}
          </div>

          {/* 进度条 — 推到右侧 */}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="smart-text-muted text-xs mb-0.5">位置提交进度</p>
              <p className="smart-text-strong text-lg font-semibold leading-none">{locationCount}/{totalParticipants}</p>
            </div>
            <div className="w-28">
              <div className="smart-progress-track">
                <div
                  className="smart-progress-fill"
                  style={{ width: `${totalParticipants === 0 ? 0 : (locationCount / totalParticipants) * 100}%` }}
                />
              </div>
              {locationCount >= 2 && <p className="text-xs mt-1 text-[var(--smart-success-text)]">可计算</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <section className="smart-card p-4 md:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 smart-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h4 className="smart-text-strong text-base font-semibold">参与者位置状态</h4>
          </div>
          <div className="space-y-2 flex-1 max-h-[320px] overflow-y-auto pr-1">
            {participants.map((p, index) => (
              <div key={p.id} className="smart-panel-soft rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="smart-status-pill smart-status-host w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">{index + 1}</span>
                    <p className="smart-text-strong text-sm font-medium truncate">
                      {p.name}{p.id === selfId ? '（我）' : ''}{room?.hostId === p.id ? '（房主）' : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${p.location ? 'text-[var(--smart-success-text)]' : 'smart-text-soft'}`}>
                    {p.location ? '✓ 已提交' : '待提交'}
                  </span>
                </div>
                {p.location?.address && (
                  <p className="smart-text-muted text-xs mt-1.5 pl-7 truncate">{p.location.address}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="smart-card p-4 md:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 smart-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h4 className="smart-text-strong text-base font-semibold">中点计算控制</h4>
          </div>
          <p className="smart-text-muted text-sm mb-3">提交当前位置后，至少 2 人可计算最佳会合城市。</p>

          {!hasSubmittedLocation && room?.status !== 'finished' && (
            <div className="space-y-3">
              {/* 单行状态条 */}
              <div className="smart-panel-soft rounded-xl px-3 py-2 text-sm smart-text-muted">
                未提交位置
              </div>
              <button
                onClick={handleGetLocation}
                disabled={isLocating || isManualResolving}
                className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLocating ? '定位中...' : '使用定位'}
              </button>
              <button
                onClick={() => { setLocationError(null); setManualInputOpen(true); }}
                disabled={isLocating || isManualResolving}
                className="smart-outline-btn w-full disabled:cursor-not-allowed disabled:opacity-40"
              >
                手动输入
              </button>
            </div>
          )}

          {hasSubmittedLocation && room?.status !== 'finished' && (
            <div className="space-y-3">
              {/* 单行状态条 */}
              <div className="smart-panel-soft rounded-xl px-3 py-2 text-sm text-[var(--smart-success-text)]">
                ✓ 位置已提交
              </div>
            </div>
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

          {locationError && !manualInputOpen && <div className="smart-error-card mt-3">{locationError}</div>}
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

      {/* 手动位置输入 BottomSheet */}
      <BottomSheet
        isOpen={manualInputOpen}
        onClose={() => { setManualInputOpen(false); setLocationError(null); }}
        title="手动输入位置"
      >
        <div className="smart-panel-soft rounded-2xl p-3 space-y-2">
          <p className="smart-text-muted text-xs">手动输入位置（支持"北京朝阳区"或"39.9042,116.4074"）</p>
          <input
            type="text"
            value={manualLocationInput}
            onChange={(e) => { setManualLocationInput(e.target.value); setLocationError(null); }}
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
          {locationError && <div className="smart-error-card">{locationError}</div>}
        </div>
      </BottomSheet>
    </div>
  );
}
