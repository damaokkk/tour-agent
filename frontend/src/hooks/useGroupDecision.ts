import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// 生产环境后端地址
const SOCKET_URL = import.meta.env.PROD 
  ? 'https://tour-agent-production.up.railway.app'
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

// localStorage key
const STORAGE_KEY = 'smart-tour:group-decision';
// 数据过期时间：7天（毫秒）
const STORAGE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

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

export function useGroupDecision() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawRollingCity, setDrawRollingCity] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const pendingJoinRef = useRef<{ roomId: string; userName: string } | null>(null);

  // 从 localStorage 恢复状态
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // 检查是否过期
        if (data.timestamp && Date.now() - data.timestamp > STORAGE_EXPIRY) {
          console.log('[useGroupDecision] 本地数据已过期，清除');
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        if (data.roomId && data.userName) {
          setUserName(data.userName);
          // 暂存，等 socket 连接后再加入
          pendingJoinRef.current = { roomId: data.roomId, userName: data.userName };
        }
      }
    } catch (e) {
      console.error('[useGroupDecision] 恢复状态失败:', e);
    }
  }, []);

  // 连接 Socket
  useEffect(() => {
    const socket = io(`${SOCKET_URL}/group-decision`, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] 已连接');
      setIsConnected(true);
      setError(null);
      // 如果有待加入的房间，自动加入
      if (pendingJoinRef.current) {
        const { roomId, userName } = pendingJoinRef.current;
        console.log('[Socket] 自动加入房间:', roomId);
        socket.emit('room:join', { 
          roomId: roomId.toUpperCase(), 
          userName 
        });
        pendingJoinRef.current = null;
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] 已断开');
      setIsConnected(false);
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] 错误:', data.message);
      setError(data.message);
    });

    socket.on('room:created', (data: { roomId: string; type: string; room: Room }) => {
      console.log('[Socket] 房间创建成功:', data.roomId);
      setRoom(data.room);
      setError(null);
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: data.roomId,
        userName: userName,
        timestamp: Date.now()
      }));
    });

    socket.on('room:joined', (data: { roomId: string; type: string; room: Room }) => {
      console.log('[Socket] 加入房间成功:', data.roomId);
      setRoom(data.room);
      setError(null);
      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        roomId: data.roomId,
        userName: userName,
        timestamp: Date.now()
      }));
    });

    socket.on('room:state', (data: { room: Room }) => {
      setRoom(data.room);
    });

    // 中点计算结果
    socket.on('midpoint:result', (data: { result: MidpointResult; room: Room }) => {
      console.log('[Socket] 中点计算结果:', data.result);
      setRoom(data.room);
    });

    // 抽签事件
    socket.on('draw:start', (data: { totalCities: number }) => {
      console.log('[Socket] 抽签开始:', data);
    });

    socket.on('draw:rolling', (data: { city: string }) => {
      setDrawRollingCity(data.city);
    });

    socket.on('draw:result', (data: { result: string; room: Room }) => {
      console.log('[Socket] 抽签结果:', data.result);
      setDrawRollingCity(null);
      setRoom(data.room);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 创建房间
  const createRoom = useCallback((type: 'midpoint' | 'draw', name: string) => {
    if (!socketRef.current) return;
    setUserName(name);
    socketRef.current.emit('room:create', { type, userName: name });
  }, []);

  // 加入房间
  const joinRoom = useCallback((roomId: string, name: string) => {
    if (!socketRef.current) return;
    setUserName(name);
    socketRef.current.emit('room:join', { roomId: roomId.toUpperCase(), userName: name });
  }, []);

  // 离开房间
  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setDrawRollingCity(null);
    setUserName('');
    // 清除 localStorage
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 更新中点位置
  const updateLocation = useCallback((lat: number, lng: number, address?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('midpoint:location', { lat, lng, address });
  }, []);

  // 请求计算中点
  const calculateMidpoint = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('midpoint:calculate');
  }, []);

  // 提交抽签选择
  const submitDrawSelection = useCallback((cities: string[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit('draw:submit', { cities });
  }, []);

  return {
    isConnected,
    room,
    error,
    drawRollingCity,
    createRoom,
    joinRoom,
    leaveRoom,
    updateLocation,
    calculateMidpoint,
    submitDrawSelection,
  };
}
