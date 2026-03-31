/**
 * 房间管理器 - 管理所有中点计算和抽签房间
 */

// 内存存储（生产环境可改为 Redis）
const rooms = new Map();

// 房间清理定时器（30分钟无活动自动清理）
const ROOM_TTL = 30 * 60 * 1000;

class RoomManager {
  constructor() {
    this.startCleanupInterval();
  }

  /**
   * 生成房间码
   */
  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * 创建中点计算房间
   */
  createMidpointRoom(creatorId, creatorName) {
    const roomId = this.generateRoomId();
    const room = {
      roomId,
      type: 'midpoint',
      hostId: creatorId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: new Map(),
      status: 'waiting', // waiting | calculating | finished
      result: null,
    };

    room.participants.set(creatorId, {
      id: creatorId,
      name: creatorName,
      location: null,
      joinedAt: Date.now(),
    });

    rooms.set(roomId, room);
    return room;
  }

  /**
   * 创建抽签房间
   */
  createDrawRoom(creatorId, creatorName) {
    const roomId = this.generateRoomId();
    const room = {
      roomId,
      type: 'draw',
      hostId: creatorId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: new Map(),
      status: 'waiting', // waiting | drawing | finished
      result: null,
      allCities: [],
    };

    room.participants.set(creatorId, {
      id: creatorId,
      name: creatorName,
      cities: [],
      confirmed: false,
      joinedAt: Date.now(),
    });

    rooms.set(roomId, room);
    return room;
  }

  /**
   * 获取房间
   */
  getRoom(roomId) {
    return rooms.get(roomId.toUpperCase());
  }

  /**
   * 加入房间
   */
  joinRoom(roomId, userId, userName) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    if (room.participants.has(userId)) {
      room.participants.get(userId).name = userName;
    } else {
      const participant = {
        id: userId,
        name: userName,
        joinedAt: Date.now(),
      };

      if (room.type === 'midpoint') {
        participant.location = null;
      } else {
        participant.cities = [];
        participant.confirmed = false;
      }

      room.participants.set(userId, participant);
    }

    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 离开房间
   */
  leaveRoom(roomId, userId) {
    const room = this.getRoom(roomId);
    if (!room) return false;

    room.participants.delete(userId);
    room.lastActivity = Date.now();

    if (room.participants.size === 0) {
      rooms.delete(roomId);
      return true;
    }

    if (room.hostId === userId) {
      const nextHost = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      room.hostId = nextHost?.id || null;
    }

    return true;
  }

  /**
   * 更新中点房间位置
   */
  updateMidpointLocation(roomId, userId, location) {
    const room = this.getRoom(roomId);
    if (!room || room.type !== 'midpoint') return null;

    const participant = room.participants.get(userId);
    if (!participant) return null;

    participant.location = location;
    room.lastActivity = Date.now();

    return room;
  }

  /**
   * 更新抽签房间选择
   */
  updateDrawSelection(roomId, userId, cities) {
    const room = this.getRoom(roomId);
    if (!room || room.type !== 'draw') return null;

    const participant = room.participants.get(userId);
    if (!participant) return null;

    const normalizedCities = [...new Set((cities || []).map((city) => String(city).trim()).filter(Boolean))];

    participant.cities = normalizedCities;
    participant.confirmed = normalizedCities.length > 0;
    room.lastActivity = Date.now();

    this.updateAllCities(room);

    return room;
  }

  /**
   * 更新房间的所有城市列表
   */
  updateAllCities(room) {
    const allCities = [];
    for (const p of room.participants.values()) {
      if (p.cities && p.cities.length > 0) {
        allCities.push(...p.cities);
      }
    }
    room.allCities = [...new Set(allCities)];
  }

  /**
   * 同步抽签房间成员状态（按城市列表重算 confirmed 与 allCities）
   */
  syncDrawParticipantsState(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.type !== 'draw') return null;

    for (const participant of room.participants.values()) {
      const normalizedCities = [...new Set((participant.cities || []).map((city) => String(city).trim()).filter(Boolean))];
      participant.cities = normalizedCities;
      participant.confirmed = normalizedCities.length > 0;
    }

    this.updateAllCities(room);
    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 单人房间兜底同步确认状态（防止提交与开奖瞬时竞态）
   */
  syncSingleParticipantConfirmation(roomId, userId) {
    const room = this.getRoom(roomId);
    if (!room || room.type !== 'draw') return null;
    if (room.participants.size !== 1) return room;

    const participant = room.participants.get(userId);
    if (!participant) return room;

    const normalizedCities = [...new Set((participant.cities || []).map((city) => String(city).trim()).filter(Boolean))];
    participant.cities = normalizedCities;
    participant.confirmed = normalizedCities.length > 0;
    room.lastActivity = Date.now();
    this.updateAllCities(room);

    return room;
  }


  /**
   * 检查是否所有人都确认了
   */
  checkAllConfirmed(room) {
    if (room.type !== 'draw') return false;
    if (room.participants.size < 1) return false;

    if (room.participants.size === 1) {
      const participant = [...room.participants.values()][0];
      return !!(participant?.cities && participant.cities.length > 0);
    }

    for (const p of room.participants.values()) {
      if (!p.confirmed || !p.cities || p.cities.length === 0) return false;
    }
    return true;
  }


  /**
   * 检查用户是否房主
   */
  isHost(room, userId) {
    return !!room && room.hostId === userId;
  }

  /**
   * 重置抽签房间，保留房间与成员
   */
  resetDrawRoom(roomId) {
    const room = this.getRoom(roomId);
    if (!room || room.type !== 'draw') return null;

    room.status = 'waiting';
    room.result = null;
    room.allCities = [];

    for (const participant of room.participants.values()) {
      participant.cities = [];
      participant.confirmed = false;
    }

    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 设置房间结果
   */
  setRoomResult(roomId, result) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.result = result;
    room.status = 'finished';
    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 设置房间状态
   */
  setRoomStatus(roomId, status) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    room.status = status;
    room.lastActivity = Date.now();
    return room;
  }

  /**
   * 将房间数据转换为可序列化的对象
   */
  serializeRoom(room) {
    if (!room) return null;

    const participants = {};
    for (const [id, p] of room.participants) {
      participants[id] = { ...p };
    }

    return {
      roomId: room.roomId,
      type: room.type,
      hostId: room.hostId,
      status: room.status,
      participants,
      result: room.result,
      allCities: room.allCities || [],
    };
  }

  /**
   * 获取中点计算的所有位置
   */
  getMidpointLocations(room) {
    if (room.type !== 'midpoint') return [];

    const locations = [];
    for (const p of room.participants.values()) {
      if (p.location) {
        locations.push({
          name: p.name,
          lat: p.location.lat,
          lng: p.location.lng,
        });
      }
    }
    return locations;
  }

  /**
   * 定期清理过期房间
   */
  startCleanupInterval() {
    setInterval(() => {
      const now = Date.now();
      for (const [roomId, room] of rooms) {
        if (now - room.lastActivity > ROOM_TTL) {
          console.log(`[RoomManager] 清理过期房间: ${roomId}`);
          rooms.delete(roomId);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    let midpointCount = 0;
    let drawCount = 0;
    let totalParticipants = 0;

    for (const room of rooms.values()) {
      if (room.type === 'midpoint') midpointCount++;
      else drawCount++;
      totalParticipants += room.participants.size;
    }

    return {
      totalRooms: rooms.size,
      midpointRooms: midpointCount,
      drawRooms: drawCount,
      totalParticipants,
    };
  }
}

export const roomManager = new RoomManager();
