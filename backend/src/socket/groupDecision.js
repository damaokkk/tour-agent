/**
 * Socket.io 多人决策命名空间处理
 * 处理中点计算和随机抽签的实时协作
 */

import { roomManager } from '../services/roomManager.js';
import { calculateMidpoint, calculateDistancesToCities } from '../services/midpointCalculator.js';
import { reverseGeocode } from '../services/baiduMap.js';

/**
 * 初始化多人决策 Socket 命名空间
 */
export function initGroupDecisionSocket(io) {
  const groupNsp = io.of('/group-decision');

  groupNsp.on('connection', (socket) => {
    console.log(`[Socket] 用户连接: ${socket.id}`);

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

        socket.join(room.roomId);
        socket.userId = socket.id;
        socket.userName = userName;
        socket.roomId = room.roomId;

        socket.emit('room:created', {
          roomId: room.roomId,
          type: room.type,
          room: roomManager.serializeRoom(room),
        });

        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 创建房间失败:', error);
        socket.emit('error', { message: '创建房间失败' });
      }
    });

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
          socket.emit('error', { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
          return;
        }

        socket.join(room.roomId);
        socket.userId = socket.id;
        socket.userName = userName;
        socket.roomId = room.roomId;

        socket.emit('room:joined', {
          roomId: room.roomId,
          type: room.type,
          room: roomManager.serializeRoom(room),
        });

        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 加入房间失败:', error);
        socket.emit('error', { message: '加入房间失败' });
      }
    });

    socket.on('room:leave', () => {
      handleLeave(socket, groupNsp);
    });

    socket.on('midpoint:location', async (data) => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'midpoint') return;

        let address = data.address;
        if (!address) {
          address = await reverseGeocode(data.lat, data.lng);
        }

        const location = {
          lat: data.lat,
          lng: data.lng,
          address: address || '未知位置',
        };

        roomManager.updateMidpointLocation(room.roomId, socket.userId, location);
        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 更新位置失败:', error);
      }
    });

    socket.on('midpoint:calculate', () => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'midpoint') return;

        const locations = roomManager.getMidpointLocations(room);
        if (locations.length < 2) {
          socket.emit('error', { message: '至少需要2个位置才能计算中点' });
          return;
        }

        roomManager.setRoomStatus(room.roomId, 'calculating');
        broadcastRoomState(groupNsp, room);

        const result = calculateMidpoint(locations);

        if (result) {
          const distances = calculateDistancesToCities(locations, result.recommendations);
          result.distances = distances;
          roomManager.setRoomResult(room.roomId, result);

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

    socket.on('draw:submit', (data) => {
      try {
        const { cities } = data;
        const room = roomManager.getRoom(socket.roomId);

        if (!room || room.type !== 'draw') return;
        if (room.status !== 'waiting') {
          socket.emit('error', { message: '当前房间状态不可提交城市' });
          return;
        }

        roomManager.updateDrawSelection(room.roomId, socket.userId, cities);
        broadcastRoomState(groupNsp, room);
      } catch (error) {
        console.error('[Socket] 提交选择失败:', error);
      }
    });

    socket.on('draw:start-manual', () => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'draw') return;

        if (!roomManager.isHost(room, socket.userId)) {
          socket.emit('error', { message: '仅房主可以开奖' });
          return;
        }

        if (room.status !== 'waiting') {
          socket.emit('error', { message: '当前房间状态不可开奖' });
          return;
        }

        roomManager.syncDrawParticipantsState(room.roomId);

        const latestRoom = roomManager.getRoom(room.roomId) || room;

        if (!roomManager.checkAllConfirmed(latestRoom)) {
          socket.emit('error', { message: '请等待全员提交完成后再开奖' });
          return;
        }


        startDraw(groupNsp, latestRoom);
      } catch (error) {
        console.error('[Socket] 手动开奖失败:', error);
      }
    });

    socket.on('draw:restart', () => {
      try {
        const room = roomManager.getRoom(socket.roomId);
        if (!room || room.type !== 'draw') return;

        if (!roomManager.isHost(room, socket.userId)) {
          socket.emit('error', { message: '仅房主可以发起再来一次' });
          return;
        }

        if (room.status === 'drawing') {
          socket.emit('error', { message: '抽签进行中，暂不可重置' });
          return;
        }

        const resetRoom = roomManager.resetDrawRoom(room.roomId);
        if (!resetRoom) {
          socket.emit('error', { message: '重置失败' });
          return;
        }

        broadcastRoomState(groupNsp, resetRoom);
      } catch (error) {
        console.error('[Socket] 重开抽签失败:', error);
      }
    });

    socket.on('disconnect', () => {
      handleLeave(socket, groupNsp);
    });
  });

  console.log('[Socket] 多人决策命名空间已初始化: /group-decision');
}

function handleLeave(socket, groupNsp) {
  if (!socket.roomId) return;

  const room = roomManager.getRoom(socket.roomId);
  if (room) {
    roomManager.leaveRoom(socket.roomId, socket.userId);
    socket.leave(socket.roomId);

    const updatedRoom = roomManager.getRoom(socket.roomId);
    if (updatedRoom) {
      broadcastRoomState(groupNsp, updatedRoom);
    }
  }

  socket.roomId = null;
  socket.userId = null;
}

function broadcastRoomState(groupNsp, room) {
  const serializedRoom = roomManager.serializeRoom(room);
  groupNsp.to(room.roomId).emit('room:state', {
    room: serializedRoom,
  });
}

function startDraw(groupNsp, room) {
  if (!room || room.type !== 'draw' || room.status !== 'waiting') return;

  const allCities = room.allCities;
  if (!allCities || allCities.length === 0) return;

  roomManager.setRoomStatus(room.roomId, 'drawing');
  broadcastRoomState(groupNsp, room);

  groupNsp.to(room.roomId).emit('draw:start', { totalCities: allCities.length });

  let count = 0;
  const interval = setInterval(() => {
    const randomCity = allCities[Math.floor(Math.random() * allCities.length)];
    groupNsp.to(room.roomId).emit('draw:rolling', { city: randomCity });
    count++;

    if (count >= 20) {
      clearInterval(interval);

      const finalResult = allCities[Math.floor(Math.random() * allCities.length)];
      roomManager.setRoomResult(room.roomId, finalResult);

      groupNsp.to(room.roomId).emit('draw:result', {
        result: finalResult,
        room: roomManager.serializeRoom(room),
      });
    }
  }, 100);
}
