import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// 后端地址：优先使用环境变量；开发环境下按当前页面协议推导，避免 https 页面连接 ws/http 被拦截
const resolveSocketUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://tour-agent-production.up.railway.app';
  }

  const envUrl = import.meta.env.VITE_API_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname || 'localhost';
    return `${protocol}//${host}:8000`;
  }

  return 'http://localhost:8000';
};

const SOCKET_URL = resolveSocketUrl();


// 数据过期时间：7天（毫秒）
const STORAGE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const getStorageKey = (mode: 'midpoint' | 'draw') => `smart-tour:group-decision:${mode}`;

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  // midpoint
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  // draw
  cities?: string[];
  confirmed?: boolean;
}

export interface Room {
  roomId: string;
  type: 'midpoint' | 'draw';
  status: 'waiting' | 'calculating' | 'drawing' | 'finished';
  participants: Record<string, Participant>;
  result?: any;
  allCities?: string[];
  hostId?: string;
}

export interface MidpointResult {
  center: { lat: number; lng: number };
  recommendations: Array<{
    name: string;
    province: string;
    lat: number;
    lng: number;
    distance: number;
  }>;
  distances?: Record<string, Array<{ name: string; distance: number }>>;
}

interface StoredRoomRef {
  roomId: string;
  userName: string;
  type: 'midpoint' | 'draw';
  timestamp: number;
}

export function useGroupDecision(mode: 'midpoint' | 'draw') {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawRollingCity, setDrawRollingCity] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const userNameRef = useRef<string>('');
  const pendingJoinRef = useRef<{ roomId: string; userName: string } | null>(null);
  const autoRecoveringJoinRef = useRef(false);
  const storageKey = getStorageKey(mode);

  // 从 localStorage 恢复状态（按模式隔离）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;

      const data = JSON.parse(saved) as StoredRoomRef;
      if (data.timestamp && Date.now() - data.timestamp > STORAGE_EXPIRY) {
        localStorage.removeItem(storageKey);
        return;
      }

      if (data.type !== mode) {
        localStorage.removeItem(storageKey);
        return;
      }

      if (data.roomId && data.userName) {
        userNameRef.current = data.userName;
        pendingJoinRef.current = { roomId: data.roomId, userName: data.userName };
        autoRecoveringJoinRef.current = true;
      }
    } catch (e) {
      console.error('[useGroupDecision] 恢复状态失败:', e);
    }
  }, [mode, storageKey]);

  // 连接 Socket
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/group-decision`, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setSelfId(socket.id ?? null);
      setError(null);
      if (pendingJoinRef.current) {
        const { roomId, userName: pendingUserName } = pendingJoinRef.current;
        socket.emit('room:join', {
          roomId: roomId.toUpperCase(),
          userName: pendingUserName,
        });
        pendingJoinRef.current = null;
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setSelfId(null);
    });

    socket.on('error', (data: { message: string; code?: string }) => {
      const isRoomNotFound = data.code === 'ROOM_NOT_FOUND' || data.message === '房间不存在';
      if (autoRecoveringJoinRef.current && isRoomNotFound) {
        autoRecoveringJoinRef.current = false;
        pendingJoinRef.current = null;
        setRoom(null);
        setError(null);
        userNameRef.current = '';
        localStorage.removeItem(getStorageKey(mode));
        return;
      }

      setError(data.message);
    });

    socket.on('room:created', (data: { roomId: string; room: Room; currentUserId?: string }) => {
      setRoom(data.room);
      if (data.currentUserId) setSelfId(data.currentUserId);
      setError(null);
      autoRecoveringJoinRef.current = false;
      if (data.room.type === mode) {
        localStorage.setItem(getStorageKey(mode), JSON.stringify({
          roomId: data.roomId,
          userName: userNameRef.current,
          type: mode,
          timestamp: Date.now(),
        }));
      }
    });

    socket.on('room:joined', (data: { roomId: string; room: Room; currentUserId?: string }) => {
      setRoom(data.room);
      if (data.currentUserId) setSelfId(data.currentUserId);
      setError(null);
      autoRecoveringJoinRef.current = false;
      if (data.room.type === mode) {
        localStorage.setItem(getStorageKey(mode), JSON.stringify({
          roomId: data.roomId,
          userName: userNameRef.current,
          type: mode,
          timestamp: Date.now(),
        }));
      }
    });

    socket.on('room:state', (data: { room: Room }) => {
      setRoom(data.room);
    });

    socket.on('midpoint:result', (data: { result: MidpointResult; room: Room }) => {
      setRoom(data.room);
    });

    socket.on('draw:start', () => {
      setDrawRollingCity(null);
    });

    socket.on('draw:rolling', (data: { city: string }) => {
      setDrawRollingCity(data.city);
    });

    socket.on('draw:result', (data: { result: string; room: Room }) => {
      setDrawRollingCity(null);
      setRoom(data.room);
    });

    return () => {
      socket.disconnect();
    };
  }, [mode]);

  const createRoom = useCallback((type: 'midpoint' | 'draw', name: string) => {
    if (!socketRef.current) return;
    userNameRef.current = name;
    autoRecoveringJoinRef.current = false;
    socketRef.current.emit('room:create', { type, userName: name });
  }, []);

  const joinRoom = useCallback((roomId: string, name: string) => {
    if (!socketRef.current) return;
    userNameRef.current = name;
    autoRecoveringJoinRef.current = false;
    socketRef.current.emit('room:join', { roomId: roomId.toUpperCase(), userName: name });
  }, []);

  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setDrawRollingCity(null);
    userNameRef.current = '';
    autoRecoveringJoinRef.current = false;
    localStorage.removeItem(getStorageKey(mode));
  }, [mode]);

  const updateLocation = useCallback((lat: number, lng: number, address?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('midpoint:location', { lat, lng, address });
  }, []);

  const calculateMidpoint = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('midpoint:calculate');
  }, []);

  const submitDrawSelection = useCallback((cities: string[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit('draw:submit', { cities });
  }, []);

  const startDrawManually = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('draw:start-manual');
  }, []);

  const restartDraw = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('draw:restart');
  }, []);

  return {
    isConnected,
    room,
    error,
    drawRollingCity,
    selfId,
    createRoom,
    joinRoom,
    leaveRoom,
    updateLocation,
    calculateMidpoint,
    submitDrawSelection,
    startDrawManually,
    restartDraw,
  };
}
