/**
 * Socket.io 多人决策命名空间处理
 * 处理中点计算和随机抽签的实时协作
 */

import { roomManager } from '../services/roomManager.js';
import { calculateMidpoint, calculateDistancesToCities } from '../services/midpointCalculator.js';

/**
 * 初始化多人决策 Socket 命名空间
 */
export function initGroupDecisionSocket(io) {
  const groupNsp = io.of('/group-decision');

  groupNsp.on('connection', (socket) => {
    console.log(`[Socket] 用户连接: ${socket.id}`);

    // ========== 通用房间事件 ==========

    /**
     * 创建房间
     * data: { type: 'midpoint' | 'draw', userName: string }
     */
    socket.on('room:create', (data) => {
      try {
        const { type, userName } = data;
        
        if (!userName) {
          socket.emit('error', { message: '请输入昵称' });
          return;
        }

        let room;
        if (type === 'midpoint') {
          room = roomManager.createMidpointRoom(socket.id, userName);
        } else if (type === 'draw') {
          room = roomManager.createDrawRoom(socket.id, userName);
        } else {
          socket.emit('error', { message: '无效的房间类型' });
          return;
        }

        // 加入 Socket.io 房间
        socket.join(room.roomId);
        socket.userId = socket.id;
        socket.userName = userName;
        socket.roomId = room.roomId;

        console.log(`[Socket] 用户 ${userName} 创建${type}房间: ${room.roomId}`);

        // 通知创建者
        socket.emit('room:created', {
          roomId: room.roomId,
          type: room.type,
          room: roomManager.serializeRoom(room),
        });

        // 广播房间状态
        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 创建房间失败:', error);
        socket.emit('error', { message: '创建房间失败' });
      }
    });

    /**
     * 加入房间
     * data: { roomId: string, userName: string }
     */
    socket.on('room:join', (data) => {
      try {
        const { roomId, userName } = data;

        if (!userName) {
          socket.emit('error', { message: '请输入昵称' });
          return;
        }

        if (!roomId) {
          socket.emit('error', { message: '请输入房间码' });
          return;
        }

        const room = roomManager.joinRoom(roomId, socket.id, userName);

        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        // 加入 Socket.io 房间
        socket.join(room.roomId);
        socket.userId = socket.id;
        socket.userName = userName;
        socket.roomId = room.roomId;

        console.log(`[Socket] 用户 ${userName} 加入房间: ${room.roomId}`);

        // 通知加入者
        socket.emit('room:joined', {
          roomId: room.roomId,
          type: room.type,
          room: roomManager.serializeRoom(room),
        });

        // 广播房间状态给所有人
        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 加入房间失败:', error);
        socket.emit('error', { message: '加入房间失败' });
      }
    });

    /**
     * 离开房间
     */
    socket.on('room:leave', () => {
      handleLeave(socket, groupNsp);
    });

    // ========== 中点计算事件 ==========

    /**
     * 更新位置
     * data: { lat: number, lng: number, address?: string }
     */
    socket.on('midpoint:location', (data) => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'midpoint') return;

        const location = {
          lat: data.lat,
          lng: data.lng,
          address: data.address || '',
        };

        roomManager.updateMidpointLocation(room.roomId, socket.userId, location);

        // 广播位置更新
        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 更新位置失败:', error);
      }
    });

    /**
     * 请求计算中点
     */
    socket.on('midpoint:calculate', () => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'midpoint') return;

        const locations = roomManager.getMidpointLocations(room);
        
        if (locations.length < 2) {
          socket.emit('error', { message: '至少需要2个位置才能计算中点' });
          return;
        }

        // 设置计算中状态
        roomManager.setRoomStatus(room.roomId, 'calculating');
        broadcastRoomState(groupNsp, room);

        // 计算中点
        const result = calculateMidpoint(locations);
        
        if (result) {
          // 计算每个人到各城市的距离
          const distances = calculateDistancesToCities(locations, result.recommendations);
          result.distances = distances;

          // 保存结果
          roomManager.setRoomResult(room.roomId, result);

          // 广播结果
          groupNsp.to(room.roomId).emit('midpoint:result', {
            result,
            room: roomManager.serializeRoom(room),
          });
        }
      } catch (error) {
        console.error('[Socket] 计算中点失败:', error);
        socket.emit('error', { message: '计算中点失败' });
      }
    });

    // ========== 随机抽签事件 ==========

    /**
     * 提交城市选择
     * data: { cities: string[] }
     */
    socket.on('draw:submit', (data) => {
      try {
        const { cities } = data;
        const room = roomManager.getRoom(socket.roomId);

        if (!room || room.type !== 'draw') return;

        // 更新选择
        roomManager.updateDrawSelection(room.roomId, socket.userId, cities);

        // 广播状态更新
        broadcastRoomState(groupNsp, room);

        // 检查是否所有人都确认了
        if (roomManager.checkAllConfirmed(room)) {
          // 延迟1秒后开始抽签，给用户确认的时间
          setTimeout(() => {
            startDraw(groupNsp, room);
          }, 1000);
        }
      } catch (error) {
        console.error('[Socket] 提交选择失败:', error);
      }
    });

    /**
     * 断开连接
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] 用户断开: ${socket.id}`);
      handleLeave(socket, groupNsp);
    });
  });

  console.log('[Socket] 多人决策命名空间已初始化: /group-decision');
}

/**
 * 处理用户离开房间
 */
function handleLeave(socket, groupNsp) {
  if (!socket.roomId) return;

  const room = roomManager.getRoom(socket.roomId);
  if (room) {
    roomManager.leaveRoom(socket.roomId, socket.userId);
    socket.leave(socket.roomId);

    // 广播更新
    const updatedRoom = roomManager.getRoom(socket.roomId);
    if (updatedRoom) {
      broadcastRoomState(groupNsp, updatedRoom);
    }
  }

  socket.roomId = null;
  socket.userId = null;
}

/**
 * 广播房间状态给所有成员
 */
function broadcastRoomState(groupNsp, room) {
  const serializedRoom = roomManager.serializeRoom(room);
  groupNsp.to(room.roomId).emit('room:state', {
    room: serializedRoom,
  });
}

/**
 * 开始抽签流程
 */
function startDraw(groupNsp, room) {
  if (!room || room.type !== 'draw' || room.status === 'finished') return;

  const allCities = room.allCities;
  if (allCities.length === 0) return;

  // 设置抽签中状态
  roomManager.setRoomStatus(room.roomId, 'drawing');
  broadcastRoomState(groupNsp, room);

  // 通知开始抽签动画
  groupNsp.to(room.roomId).emit('draw:start', { totalCities: allCities.length });

  // 滚动动画（每100ms一次，共20次 = 2秒）
  let count = 0;
  const interval = setInterval(() => {
    const randomCity = allCities[Math.floor(Math.random() * allCities.length)];
    groupNsp.to(room.roomId).emit('draw:rolling', { city: randomCity });
    count++;

    if (count >= 20) {
      clearInterval(interval);

      // 最终结果
      const finalResult = allCities[Math.floor(Math.random() * allCities.length)];
      roomManager.setRoomResult(room.roomId, finalResult);

      groupNsp.to(room.roomId).emit('draw:result', {
        result: finalResult,
        room: roomManager.serializeRoom(room),
      });
    }
  }, 100);
}
