import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
    });

    socket.on('room:joined', (data: { roomId: string; type: string; room: Room }) => {
      console.log('[Socket] 加入房间成功:', data.roomId);
      setRoom(data.room);
      setError(null);
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
  const createRoom = useCallback((type: 'midpoint' | 'draw', userName: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:create', { type, userName });
  }, []);

  // 加入房间
  const joinRoom = useCallback((roomId: string, userName: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:join', { roomId: roomId.toUpperCase(), userName });
  }, []);

  // 离开房间
  const leaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('room:leave');
    setRoom(null);
    setDrawRollingCity(null);
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
