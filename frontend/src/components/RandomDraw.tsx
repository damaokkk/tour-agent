import { useEffect, useState } from 'react';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';
import CityPicker from './ui/CityPicker';
import Modal from './ui/Modal';
import AvatarBadge from './ui/AvatarBadge';
import DrawResultModal from './DrawResultModal';

interface RandomDrawProps {
  onSelectCity: (city: string) => void;
  onRoomChange?: (info: { roomId: string; isConnected: boolean; isHost: boolean } | null) => void;
}

const TAG_STYLES = ['smart-tag-blue', 'smart-tag-indigo', 'smart-tag-purple', 'smart-tag-cyan'];

export function RandomDraw({ onSelectCity, onRoomChange }: RandomDrawProps) {
  const [step, setStep] = useState<'create' | 'join' | 'room'>('create');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [myCities, setMyCities] = useState<string[]>([]);
  const [modalType, setModalType] = useState<'create' | 'join' | null>(null);
  const [modalError, setModalError] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [drawModalOpen, setDrawModalOpen] = useState(false);

  const {
    isConnected,
    room,
    error,
    drawRollingCity,
    createRoom,
    joinRoom,
    leaveRoom,
    submitDrawSelection,
    startDrawManually,
    restartDraw,
    drawAgain,
  } = useGroupDecision('draw');

  useEffect(() => {
    if (room) {
      setStep('room');
      setModalType(null);
    }
    const me = room ? Object.values(room.participants).find((p) => p.name === userName) : null;
    onRoomChange?.(room ? {
      roomId: room.roomId,
      isConnected,
      isHost: !!(me && room.hostId === me.id),
    } : null);
  }, [room, isConnected, userName, onRoomChange]);

  useEffect(() => {
    if (!room) return;
    const meInRoom = Object.values(room.participants).find((p) => p.name === userName);
    if (meInRoom?.cities && meInRoom.cities.length > 0 && room.status === 'waiting') setMyCities(meInRoom.cities);
    if (room.status === 'waiting' && !meInRoom?.confirmed && meInRoom?.cities?.length === 0) {
      setMyCities([]);
    }
  }, [room, userName]);

  const me = room ? Object.values(room.participants).find((p: Participant) => p.name === userName) : null;
  const participants = room ? Object.values(room.participants).sort((a, b) => a.joinedAt - b.joinedAt) : [];
  const progress = {
    confirmed: participants.filter((p) => p.confirmed).length,
    total: participants.length,
  };
  const allConfirmed = progress.total >= 1 && progress.confirmed === progress.total;
  const isHost = !!(room && me && room.hostId === me.id);
  const drawResult = typeof room?.result === 'string' ? room.result : null;
  const canStartDraw = !!(isHost && allConfirmed);

  // Requirements 6.1: drawRollingCity 非 null 时打开弹窗
  useEffect(() => {
    if (drawRollingCity !== null) {
      setDrawModalOpen(true);
    }
  }, [drawRollingCity]);

  // Requirements 6.2: room.result 有值时确保弹窗打开
  useEffect(() => {
    if (drawResult) {
      setDrawModalOpen(true);
    }
  }, [drawResult]);

  // Requirements 7.1, 7.2, 7.3: 重新选城市
  const handleRestartSelection = () => {
    restartDraw();
    setDrawModalOpen(false);
    setMyCities([]);
  };

  // 再抽一次 — 保留城市，重置状态后直接开奖
  const handleDrawAgain = () => {
    drawAgain();
  };

  const handleConfirmSelection = () => {
    if (myCities.length === 0) {
      alert('请至少添加一个城市');
      return;
    }
    submitDrawSelection(myCities);
  };

  const handleCreateRoom = () => {
    if (!userName.trim()) {
      setModalError('请输入您的昵称');
      return;
    }
    setModalError('');
    createRoom('draw', userName.trim());
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

  const handleLeave = () => {
    leaveRoom();
    setStep('create');
    setRoomId('');
    setMyCities([]);
    onRoomChange?.(null);
  };

  const handleStartDraw = () => {
    if (!room || !isHost || room.status !== 'waiting') return;
    if (allConfirmed) {
      startDrawManually();
    }
  };

  const openModal = (type: 'create' | 'join') => {
    setModalError('');
    setModalType(type);
  };

  // 主界面（create/join 步骤时显示入口按钮）
  if (step === 'create' || step === 'join') {
    return (
      <div className="mx-auto max-w-md space-y-4 pt-[15vh]">
        <div className="smart-card-inner p-5 md:p-6">
          <h3 className="smart-text-strong mb-3 text-center text-xl font-semibold">多人出行决策</h3>
          <p className="smart-text-muted mb-5 text-center text-sm">
            创建房间后分享房间号，大家提交心仪城市后由房主开奖
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
          title={modalType === 'join' ? '加入决策房间' : '创建决策房间'}
        >
          <div className="space-y-3">
            <p className="smart-text-muted text-sm">
              {modalType === 'join'
                ? '输入昵称与房间号，即可进入多人出行决策面板'
                : '创建房间后分享房间号，大家提交心仪城市后由房主开奖'}
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
    <div className="flex flex-col gap-4 h-full md:flex-row md:items-start md:max-w-4xl md:mx-auto md:w-full">

      {/* ── 左列（web端）/ 上方（移动端）：全员汇总 ── */}
      <div className="flex flex-col gap-4 md:flex-1 md:min-w-0">

        {/* ── 1. 全员结果汇总区域 (ParticipantSummarySection) ── */}
        <div className="smart-card p-3 flex flex-col">
          <h4 className="smart-text-strong text-sm font-semibold mb-2 flex-shrink-0">全员准备汇总</h4>
          <div className="max-h-[40vh] md:max-h-[60vh] overflow-y-auto space-y-2 pr-0.5">
            {participants.map((p) => {
              const cities = p.cities || [];
              return (
                <div key={p.id} className="flex items-start gap-2 py-1">
                  <AvatarBadge name={p.name} confirmed={!!p.confirmed} size="md" />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="smart-text-strong text-sm font-medium leading-tight">{p.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {cities.length === 0
                        ? <span className="smart-text-soft text-xs">等待选择...</span>
                        : cities.map((city, index) => (
                            <span key={`${p.id}-${city}`} className={`smart-city-chip text-xs ${TAG_STYLES[index % TAG_STYLES.length]}`}>{city}</span>
                          ))
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 右列（web端）/ 下方（移动端）：我的操作区 ── */}
      <div className="flex flex-col gap-4 md:w-72 md:flex-shrink-0">

        {/* ── 2. 我的心仪城市区域 (MyCitiesSection) ── */}
        <div className="smart-card p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="smart-text-strong text-sm font-semibold">我的心仪城市</h4>
            {!me?.confirmed && room?.status === 'waiting' && (
              <button onClick={() => setCityPickerOpen(true)} className="smart-outline-btn px-2.5 py-1 text-xs">
                + 添加城市
              </button>
            )}
          </div>

          {me?.confirmed ? (
            <p className="smart-success-note rounded-lg px-2 py-1.5 text-xs text-center">已提交，等待开奖</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                {myCities.length === 0
                  ? <span className="smart-text-soft text-xs">还没有添加城市</span>
                  : myCities.map((city, index) => (
                      <span key={city} className={`smart-city-chip text-xs ${TAG_STYLES[index % TAG_STYLES.length]}`}>
                        {city}
                        {room?.status === 'waiting' && (
                          <button
                            onClick={() => setMyCities((prev) => prev.filter((item) => item !== city))}
                            className="px-0.5 text-white/90 hover:text-white"
                          >×</button>
                        )}
                      </span>
                    ))
                }
              </div>
              {/* 确认提交按钮 */}
              {room?.status === 'waiting' && (
                <button
                  onClick={handleConfirmSelection}
                  disabled={myCities.length === 0}
                  className="smart-main-btn w-full py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-35"
                >
                  确认提交（{myCities.length}）
                </button>
              )}
            </>
          )}
        </div>

        {/* ── 3. 房主操作区 (HostActionsSection) — 仅房主可见 ── */}
        {isHost && (
          <div className="smart-card px-4 py-3 flex flex-col gap-2 flex-shrink-0">
            <div className="flex gap-2">
              <button
                onClick={handleStartDraw}
                disabled={!canStartDraw || !isConnected}
                className="smart-main-btn flex-1 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-35"
              >
              {!isConnected ? '连接中...' : '开始抽签'}
              </button>
              <button
                onClick={handleRestartSelection}
                disabled={!isConnected}
                className="smart-outline-btn flex-1 py-2 text-sm rounded-2xl disabled:cursor-not-allowed disabled:opacity-35"
              >
                {!isConnected ? '连接中...' : '重新选城市'}
              </button>
            </div>
            {room?.status === 'waiting' && !allConfirmed && (
              <p className="smart-text-muted text-center text-xs">
                {progress.total <= 1 ? '请先提交城市后再开奖' : '需全员提交后才能开奖'}
              </p>
            )}
          </div>
        )}

        {error && <div className="smart-error-card flex-shrink-0">{error}</div>}

      </div>

      {/* 城市选择 Modal */}
      <Modal isOpen={cityPickerOpen} onClose={() => setCityPickerOpen(false)} title="选择城市">
        <CityPicker
          onConfirm={(city) => { setMyCities(prev => prev.includes(city) ? prev : [...prev, city]); setCityPickerOpen(false); }}
          onClose={() => setCityPickerOpen(false)}
          selectedCities={myCities}
        />
      </Modal>

      {/* 抽奖弹窗 — Requirements: 6.1, 6.2, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4 */}
      <DrawResultModal
        isOpen={drawModalOpen}
        rollingCity={drawRollingCity}
        resultCity={drawResult}
        isHost={isHost}
        onUseCity={(city) => { onSelectCity(city); setDrawModalOpen(false); }}
        onDrawAgain={handleDrawAgain}
        onClose={() => setDrawModalOpen(false)}
      />
    </div>
  );
}
