/**
 * 本地 12306 数据库查询服务
 * 使用 better-sqlite3 同步 API，零网络延迟，最高优先级数据源
 *
 * 数据库结构：
 *   smart-tour/db/train_basic.db          - 车次基础信息（表名为车次类型 G/D/K/T/Z 等）
 *   smart-tour/db/station_based_code.db   - 站名索引（表名为站名）
 *   smart-tour/db/{type}/train_timetable_info.db - 完整时刻表（表名为 train_full_code）
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getDBRoot() {
  if (config.localTrainDBPath) {
    return config.localTrainDBPath;
  }
  return path.resolve(__dirname, '../../../db');
}

// 车次类型列表（用于遍历所有类型）
const TRAIN_TYPES = ['G', 'D', 'C', 'Z', 'T', 'K', 'Y', 'S', 'P'];

// ── 连接池 ──────────────────────────────────────────────────────────────
const _dbPool = new Map(); // dbPath → Database 实例

/**
 * 获取（或创建）数据库连接，懒加载 + 进程内复用
 * @param {string} dbPath - 数据库文件绝对路径
 * @returns {Database|null}
 */
function getDB(dbPath) {
  if (_dbPool.has(dbPath)) return _dbPool.get(dbPath);
  try {
    const db = new Database(dbPath, { readonly: true });
    _dbPool.set(dbPath, db);
    return db;
  } catch (e) {
    console.warn(`[LocalTrainDB] 无法打开数据库: ${dbPath}`, e.message);
    return null;
  }
}

// ── 站名列表缓存 ─────────────────────────────────────────────────────────
let _allStationNames = null; // 懒加载，首次调用时初始化

/**
 * 获取 station_based_code.db 中所有站名（表名列表），带缓存
 * @returns {string[]}
 */
function getAllStationNames() {
  if (_allStationNames !== null) return _allStationNames;
  const dbPath = path.join(getDBRoot(), 'station_based_code.db');
  const db = getDB(dbPath);
  if (!db) {
    _allStationNames = [];
    return _allStationNames;
  }
  try {
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    _allStationNames = rows.map(r => r.name);
  } catch (e) {
    console.warn('[LocalTrainDB] 读取站名列表失败:', e.message);
    _allStationNames = [];
  }
  return _allStationNames;
}

// ── 公开 API ─────────────────────────────────────────────────────────────

/**
 * 城市名 → 站名模糊匹配（前缀匹配）
 * 例："上海" → ["上海", "上海南", "上海虹桥"]
 * @param {string} cityName
 * @returns {string[]}
 */
export function getCityStations(cityName) {
  if (!cityName) return [];
  const allNames = getAllStationNames();
  return allNames.filter(name => name.startsWith(cityName));
}

/**
 * 获取经停某站的所有车次完整代码集合
 * @param {string} stationName - 精确站名
 * @returns {Set<string>}
 */
export function getTrainsAtStation(stationName) {
  const dbPath = path.join(getDBRoot(), 'station_based_code.db');
  const db = getDB(dbPath);
  if (!db) return new Set();
  try {
    // 站名可能含特殊字符，用双引号转义表名
    const escaped = stationName.replace(/"/g, '""');
    const rows = db.prepare(`SELECT train_full_code FROM "${escaped}"`).all();
    return new Set(rows.map(r => r.train_full_code));
  } catch (e) {
    // 表不存在（该站无数据）时静默返回空集合
    return new Set();
  }
}

/**
 * 查找两城市间的直达车次（交集算法）
 * @param {string[]} originStations  - 出发城市的所有站名
 * @param {string[]} destStations    - 目的城市的所有站名
 * @returns {Set<string>} DirectTrain 候选集（train_full_code）
 */
export function findDirectTrains(originStations, destStations) {
  // 出发城市所有站的车次并集
  const originSet = new Set();
  for (const s of originStations) {
    for (const code of getTrainsAtStation(s)) originSet.add(code);
  }
  // 目的城市所有站的车次并集
  const destSet = new Set();
  for (const s of destStations) {
    for (const code of getTrainsAtStation(s)) destSet.add(code);
  }
  // 取交集
  const result = new Set();
  for (const code of originSet) {
    if (destSet.has(code)) result.add(code);
  }
  return result;
}

/**
 * 将 "HH:MM" 格式的运行时间转换为分钟数
 * @param {string} runTime - 如 "04:29"
 * @returns {number}
 */
function runTimeToMinutes(runTime) {
  const [h, m] = runTime.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 筛选最优车次（优先 G/D，耗时最短）
 * @param {Set<string>} candidateSet - DirectTrain 候选集
 * @returns {{trainFullCode: string, trainType: string, trainCode: string, runMinutes: number}|null}
 */
export function selectOptimalTrain(candidateSet) {
  if (!candidateSet || candidateSet.size === 0) return null;

  const dbPath = path.join(getDBRoot(), 'train_basic.db');
  const db = getDB(dbPath);
  if (!db) return null;

  const candidates = Array.from(candidateSet);
  // SQLite IN 子句占位符
  const placeholders = candidates.map(() => '?').join(',');

  let best = null;

  // 优先查 G 和 D 类型
  for (const type of ['G', 'D']) {
    try {
      const rows = db.prepare(
        `SELECT train_full_code, run_time FROM "${type}" WHERE train_full_code IN (${placeholders})`
      ).all(...candidates);

      for (const row of rows) {
        const minutes = runTimeToMinutes(row.run_time || '99:99');
        if (!best || minutes < best.runMinutes) {
          best = {
            trainFullCode: row.train_full_code,
            trainType: type,
            runMinutes: minutes,
          };
        }
      }
    } catch (e) {
      // 表不存在时跳过
    }
  }

  if (best) return best;

  // G/D 无结果，遍历所有类型
  for (const type of TRAIN_TYPES) {
    try {
      const rows = db.prepare(
        `SELECT train_full_code, run_time FROM "${type}" WHERE train_full_code IN (${placeholders})`
      ).all(...candidates);

      for (const row of rows) {
        const minutes = runTimeToMinutes(row.run_time || '99:99');
        if (!best || minutes < best.runMinutes) {
          best = {
            trainFullCode: row.train_full_code,
            trainType: type,
            runMinutes: minutes,
          };
        }
      }
    } catch (e) {
      // 表不存在时跳过
    }
  }

  return best;
}

/**
 * 从时刻表计算精确区间运行时间（分钟）
 * @param {string} trainFullCode - 完整车次代码
 * @param {string} trainType     - 车次类型（G/D/K/T/Z 等）
 * @param {string} originStation - 出发站名
 * @param {string} destStation   - 目的站名
 * @returns {number|null}
 */
export function getSectionDuration(trainFullCode, trainType, originStation, destStation) {
  const dbPath = path.join(getDBRoot(), trainType, 'train_timetable_info.db');
  const db = getDB(dbPath);
  if (!db) return null;

  try {
    const escaped = trainFullCode.replace(/"/g, '""');
    const rows = db.prepare(`SELECT station_name, start_time, arrive_time, arrive_day_diff FROM "${escaped}"`).all();

    const originRow = rows.find(r => r.station_name === originStation);
    const destRow = rows.find(r => r.station_name === destStation);

    if (!originRow || !destRow) return null;

    // 确保方向正确（出发站序号 < 目的站序号）
    const originIdx = rows.indexOf(originRow);
    const destIdx = rows.indexOf(destRow);
    if (originIdx >= destIdx) return null;

    const toMin = (timeStr, dayDiff) => {
      if (!timeStr || timeStr === '----') return null;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m + (dayDiff || 0) * 1440;
    };

    const originStart = toMin(originRow.start_time, originRow.arrive_day_diff);
    const destArrive = toMin(destRow.arrive_time, destRow.arrive_day_diff);

    if (originStart === null || destArrive === null) return null;
    return destArrive - originStart;
  } catch (e) {
    console.warn(`[LocalTrainDB] 查询时刻表失败 ${trainFullCode}:`, e.message);
    return null;
  }
}

/**
 * 从 station_based_code.db 获取某车次在某站的车次号（如 "G1"）
 * @param {string} trainFullCode
 * @param {string} stationName
 * @returns {string|null}
 */
function getTrainCodeAtStation(trainFullCode, stationName) {
  const dbPath = path.join(getDBRoot(), 'station_based_code.db');
  const db = getDB(dbPath);
  if (!db) return null;
  try {
    const escaped = stationName.replace(/"/g, '""');
    const row = db.prepare(`SELECT train_code FROM "${escaped}" WHERE train_full_code = ?`).get(trainFullCode);
    return row ? row.train_code : null;
  } catch (e) {
    return null;
  }
}

/**
 * 主入口：查找两城市间最优直达车次
 * @param {string} origin      - 出发城市名（如"上海"）
 * @param {string} destination - 目的城市名（如"北京"）
 * @returns {{trainNumber, trainFullCode, trainType, duration, originStation, destStation}|null}
 */
export function findBestDirectTrain(origin, destination) {
  try {
    // 1. 城市名 → 站名列表
    const originStations = getCityStations(origin);
    const destStations = getCityStations(destination);

    if (originStations.length === 0 || destStations.length === 0) {
      console.warn(`[LocalTrainDB] 城市站名匹配失败: ${origin} → ${destination}`);
      return null;
    }

    // 2. 求直达车次交集
    const directSet = findDirectTrains(originStations, destStations);
    if (directSet.size === 0) {
      console.info(`[LocalTrainDB] 无直达车次: ${origin} → ${destination}`);
      return null;
    }

    // 3. 筛选最优车次
    const optimal = selectOptimalTrain(directSet);
    if (!optimal) return null;

    // 4. 确定实际出发站和目的站（取第一个匹配的站名）
    const originStation = originStations.find(s => getTrainsAtStation(s).has(optimal.trainFullCode)) || originStations[0];
    const destStation = destStations.find(s => getTrainsAtStation(s).has(optimal.trainFullCode)) || destStations[0];

    // 5. 从时刻表获取精确区间时间
    const sectionDuration = getSectionDuration(optimal.trainFullCode, optimal.trainType, originStation, destStation);
    // 若时刻表查询失败，回退到 run_time 全程时间
    const duration = sectionDuration !== null ? sectionDuration : optimal.runMinutes;

    // 6. 获取车次号（如 "G1"）
    const trainNumber = getTrainCodeAtStation(optimal.trainFullCode, originStation) || optimal.trainFullCode;

    return {
      trainNumber,
      trainFullCode: optimal.trainFullCode,
      trainType: optimal.trainType,
      duration,
      originStation,
      destStation,
    };
  } catch (e) {
    console.warn(`[LocalTrainDB] findBestDirectTrain 异常:`, e.message);
    return null;
  }
}
