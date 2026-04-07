import { db } from '../db/database.js';
import { nanoid } from 'nanoid';

const SAVE_LIMIT = 50;

/**
 * Save a new itinerary for a device.
 * Throws if the device has reached the 50-itinerary limit.
 */
async function save(itinerary, deviceId) {
  const count = await countByDeviceId(deviceId);
  if (count >= SAVE_LIMIT) {
    throw new Error('已达保存上限，请删除旧行程后重试');
  }

  const id = nanoid(12);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO itineraries (id, share_token, device_id, destination, total_days, content, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
  `).run(id, deviceId, itinerary.destination, itinerary.totalDays, JSON.stringify(itinerary), now, now);

  return { id, shareToken: null };
}

/**
 * Find an itinerary by its id.
 * Returns null if not found. Returns a descriptive error object if content is malformed.
 */
async function findById(id) {
  const row = db.prepare('SELECT * FROM itineraries WHERE id = ?').get(id);
  if (!row) return null;

  try {
    row.content = JSON.parse(row.content);
  } catch {
    return { error: `行程内容解析失败，数据可能已损坏 (id: ${id})` };
  }

  return row;
}

/**
 * Find an itinerary by its share token.
 * Returns null if not found.
 */
async function findByShareToken(token) {
  const row = db.prepare('SELECT * FROM itineraries WHERE share_token = ?').get(token);
  if (!row) return null;

  try {
    row.content = JSON.parse(row.content);
  } catch {
    return { error: `行程内容解析失败，数据可能已损坏 (token: ${token})` };
  }

  return row;
}

/**
 * Return a summary list of itineraries for a device, ordered by created_at DESC.
 */
async function findByDeviceId(deviceId) {
  return db.prepare(`
    SELECT id, destination, total_days AS totalDays, created_at AS createdAt
    FROM itineraries
    WHERE device_id = ?
    ORDER BY created_at DESC
  `).all(deviceId);
}

/**
 * Get or create a share token for an itinerary.
 * Returns the token string.
 */
async function getOrCreateShareToken(id) {
  const row = db.prepare('SELECT share_token FROM itineraries WHERE id = ?').get(id);
  if (!row) throw new Error(`行程不存在 (id: ${id})`);

  if (row.share_token) return row.share_token;

  const token = nanoid(10);
  const now = new Date().toISOString();
  db.prepare('UPDATE itineraries SET share_token = ?, updated_at = ? WHERE id = ?').run(token, now, id);

  return token;
}

/**
 * Count the number of itineraries saved by a device.
 */
async function countByDeviceId(deviceId) {
  const result = db.prepare('SELECT COUNT(*) AS count FROM itineraries WHERE device_id = ?').get(deviceId);
  return result.count;
}

export { save, findById, findByShareToken, findByDeviceId, getOrCreateShareToken, countByDeviceId };
