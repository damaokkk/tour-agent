import { useEffect, useState } from 'react';
import { useGroupDecision, type Participant } from '../hooks/useGroupDecision';
import CityPicker from './ui/CityPicker';
import Modal from './ui/Modal';

interface RandomDrawProps {
  onSelectCity: (city: string) => void;
}

const TAG_STYLES = ['smart-tag-blue', 'smart-tag-indigo', 'smart-tag-purple', 'smart-tag-cyan'];

export function RandomDraw({ onSelectCity }: RandomDrawProps) {
  const [step, setStep] = useState<'create' | 'join' | 'room'>('create');
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [myCities, setMyCities] = useState<string[]>([]);
  const [pendingStartAfterSubmit, setPendingStartAfterSubmit] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'join' | null>(null);
  const [modalError, setModalError] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

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
  } = useGroupDecision('draw');

  useEffect(() => {
    if (room) {
      setStep('room');
      setModalType(null);
    }
  }, [room]);

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
  const isDrawing = room?.status === 'drawing';
  const drawResult = typeof room?.result === 'string' ? room.result : '';
  const canStartWithAutoSubmit = !!(isHost && progress.total === 1 && !me?.confirmed && myCities.length > 0);
  const canStartDraw = !!(isHost && (allConfirmed || canStartWithAutoSubmit));

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
    setPendingStartAfterSubmit(false);
  };

  const handleStartDraw = () => {
    if (!room || !isHost || room.status !== 'waiting') return;

    if (canStartWithAutoSubmit) {
      submitDrawSelection(myCities);
      setPendingStartAfterSubmit(true);
      return;
    }

    if (allConfirmed) {
      startDrawManually();
    }
  };

  useEffect(() => {
    if (!pendingStartAfterSubmit || !room || !isHost || room.status !== 'waiting') return;
    if (me?.confirmed) {
      startDrawManually();
      setPendingStartAfterSubmit(false);
    }
  }, [pendingStartAfterSubmit, room, isHost, me?.confirmed, startDrawManually]);

  const openModal = (type: 'create' | 'join') => {
    setModalError('');
    setModalType(type);
  };

  // 主界面（create/join 步骤时显示入口按钮）
  if (step === 'create' || step === 'join') {
    return (
      <div className="mx-auto max-w-md space-y-4">
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
    <div className="space-y-4 md:space-y-5">
      <section className="smart-header-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="smart-text-muted text-sm">房间号</p>
            <p className="smart-text-strong text-3xl font-semibold tracking-widest">{room?.roomId}</p>
            <div className="smart-text-muted mt-1 flex items-center gap-2 text-xs">
              <span className={`smart-status-pill ${isConnected ? 'smart-status-ok' : 'smart-status-danger'}`}>
                {isConnected ? '已连接' : '未连接'}
              </span>
              {isHost && <span className="smart-status-pill smart-status-host">您是房主</span>}
            </div>
          </div>

          <div className="w-full max-w-[250px]">
            <div className="smart-text-muted mb-1 flex items-center justify-between">
              <span className="text-sm">全员准备进度</span>
              <span className="text-xl font-semibold">{progress.confirmed}/{progress.total}</span>
            </div>
            <div className="smart-progress-track">
              <div
                className="smart-progress-fill"
                style={{ width: `${progress.total === 0 ? 0 : (progress.confirmed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <section className="smart-card p-4 md:p-5 flex flex-col">
          <h4 className="smart-text-strong mb-3 text-3xl font-semibold tracking-tight">我的心仪城市</h4>
          {!me?.confirmed && room?.status === 'waiting' && (
            <div className="mb-3">
              <button
                onClick={() => setCityPickerOpen(true)}
                className="smart-outline-btn w-full"
              >
                添加城市
              </button>
            </div>
          )}

          <div className="smart-panel-soft mb-3 min-h-[64px] flex-1 rounded-2xl p-2.5">
            <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
              {myCities.length === 0 && <span className="smart-text-soft text-sm">还没有添加城市</span>}
              {myCities.map((city, index) => (
                <span key={city} className={`smart-city-chip flex-shrink-0 ${TAG_STYLES[index % TAG_STYLES.length]}`}>
                  {city}
                  {!me?.confirmed && room?.status === 'waiting' && (
                    <button onClick={() => setMyCities((prev) => prev.filter((item) => item !== city))} className="px-0.5 text-white/90 hover:text-white">×</button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {!me?.confirmed && room?.status === 'waiting' ? (
            <button onClick={handleConfirmSelection} disabled={myCities.length === 0} className="smart-main-btn w-full mt-auto disabled:cursor-not-allowed disabled:opacity-35">
              确认并提交（{myCities.length}）
            </button>
          ) : (
            <p className="smart-success-note rounded-xl px-3 py-2 text-sm mt-auto">已提交，等待房主开奖</p>
          )}
        </section>

        <section className="smart-card p-4 md:p-5 flex flex-col">
          <h4 className="smart-text-strong mb-3 text-3xl font-semibold tracking-tight">全员准备汇总</h4>
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
            {participants.map((p) => {
              const cities = p.cities || [];
              return (
                <div key={p.id} className="smart-panel-soft rounded-2xl p-3">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="smart-text-strong text-base font-medium">
                      {p.name}{p.name === userName ? '（我）' : ''}{room?.hostId === p.id ? '（房主）' : ''}
                    </p>
                    <span className={`text-sm font-medium ${p.confirmed ? 'text-[var(--smart-success-text)]' : 'text-[var(--smart-danger-text)]'}`}>
                      {p.confirmed ? '已确认' : '准备中'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {cities.length === 0 ? (
                        <span className="smart-text-soft text-sm">等待选择...</span>
                      ) : (
                        cities.map((city, index) => (
                          <span key={`${p.id}-${city}`} className={`smart-city-chip ${TAG_STYLES[index % TAG_STYLES.length]}`}>{city}</span>
                        ))
                      )}
                    </div>
                    <span className="smart-text-muted text-sm whitespace-nowrap">{cities.length}城市数</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="smart-card p-4 md:p-5">
        <h4 className="smart-text-strong mb-2 text-3xl font-semibold tracking-tight">房主抽签控制</h4>
        <p className="smart-text-muted mb-3 text-sm">
          等待可开奖条件满足后开始抽签（当前 {progress.confirmed}/{progress.total}）
        </p>

        {room?.status === 'waiting' && (
          <>
            <button onClick={handleStartDraw} disabled={!canStartDraw} className="smart-main-btn w-full disabled:cursor-not-allowed disabled:opacity-35">
              {isHost ? (canStartWithAutoSubmit ? '提交并开始抽签' : '开始抽签') : '仅房主可操作'}
            </button>
            {!isHost && <p className="smart-text-muted mt-2 text-center text-xs">您不是房主，需等待房主开奖</p>}
            {isHost && !allConfirmed && (
              <p className="smart-text-muted mt-2 text-center text-xs">
                {progress.total <= 1 ? '请先提交城市后再开奖' : '需全员提交后才能开奖'}
              </p>
            )}
          </>
        )}

        {(isDrawing || drawResult || drawRollingCity) && (
          <div className="smart-result-shell mt-3 rounded-2xl p-4 text-center">
            <p className="smart-text-muted text-sm">{isDrawing ? '抽签中...' : '抽签结果'}</p>
            <p className={`mt-1 text-4xl font-bold ${isDrawing ? 'animate-pulse text-[var(--smart-secondary)]' : 'smart-text-strong'}`}>
              {drawRollingCity || drawResult || '...'}
            </p>
            {!isDrawing && drawResult && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => onSelectCity(drawResult)} className="smart-main-btn">用此城市生成行程</button>
                {isHost && (
                  <button onClick={restartDraw} className="smart-outline-btn">同房间再来一次</button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {error && <div className="smart-error-card">{error}</div>}

      <div className="pt-1 text-center">
        <button onClick={handleLeave} className="smart-text-muted text-sm transition hover:text-[var(--smart-text-strong)]">离开房间</button>
      </div>

      {/* 城市选择 Modal */}
      <Modal isOpen={cityPickerOpen} onClose={() => setCityPickerOpen(false)} title="选择城市">
        <CityPicker
          onConfirm={(city) => { setMyCities(prev => prev.includes(city) ? prev : [...prev, city]); setCityPickerOpen(false); }}
          onClose={() => setCityPickerOpen(false)}
          selectedCities={myCities}
        />
      </Modal>
    </div>
  );
}
