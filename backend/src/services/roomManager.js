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
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: new Map(),
      status: 'waiting', // waiting | calculating | finished
      result: null,
    };

    // 添加创建者
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
      createdAt: Date.now(),
      lastActivity: Date.now(),
      participants: new Map(),
      status: 'waiting', // waiting | drawing | finished
      result: null,
      allCities: [],
    };

    // 添加创建者
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

    // 如果用户已在房间，更新名称
    if (room.participants.has(userId)) {
      room.participants.get(userId).name = userName;
    } else {
      // 新用户加入
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

    // 如果房间空了，删除房间
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      return true;
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

    participant.cities = cities;
    participant.confirmed = true;
    room.lastActivity = Date.now();

    // 更新所有城市列表
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
    room.allCities = [...new Set(allCities)]; // 去重
  }

  /**
   * 检查是否所有人都确认了
   */
  checkAllConfirmed(room) {
    if (room.type !== 'draw') return false;
    if (room.participants.size < 2) return false;

    for (const p of room.participants.values()) {
      if (!p.confirmed) return false;
    }
    return true;
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
    }, 5 * 60 * 1000); // 每5分钟检查一次
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

// 导出单例
export const roomManager = new RoomManager();
