import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 数据库文件存储在 backend/data/smarttour.db
const dbPath = join(__dirname, '../../data/smarttour.db');

const db = new Database(dbPath);

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 创建 itineraries 表
db.exec(`
  CREATE TABLE IF NOT EXISTS itineraries (
    id          TEXT PRIMARY KEY,
    share_token TEXT UNIQUE,
    device_id   TEXT NOT NULL,
    destination TEXT NOT NULL,
    total_days  INTEGER NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_device_id ON itineraries(device_id);
  CREATE INDEX IF NOT EXISTS idx_share_token ON itineraries(share_token);
`);

export { db };
