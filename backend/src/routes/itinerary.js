import { Router } from 'express';
import {
  save,
  findById,
  findByShareToken,
  findByDeviceId,
  getOrCreateShareToken,
} from '../services/itineraryService.js';

const router = Router();

// POST / — save a new itinerary
router.post('/', async (req, res) => {
  const { deviceId, itinerary } = req.body;
  if (!deviceId || !itinerary) {
    return res.status(400).json({ error: '缺少必要参数: deviceId 和 itinerary' });
  }

  try {
    const result = await save(itinerary, deviceId);
    return res.status(201).json({
      id: result.id,
      shareToken: result.shareToken,
      createdAt: result.createdAt ?? new Date().toISOString(),
    });
  } catch (err) {
    if (err.message && err.message.includes('已达保存上限')) {
      return res.status(429).json({ error: err.message });
    }
    console.error('[itinerary] save error:', err);
    return res.status(503).json({ error: '服务暂时不可用，请稍后重试' });
  }
});

// GET /share/:token — MUST be before GET /:id to avoid route conflict
router.get('/share/:token', async (req, res) => {
  const record = await findByShareToken(req.params.token);
  if (!record) {
    return res.status(404).json({ error: '行程不存在或链接已失效' });
  }
  return res.status(200).json(record);
});

// GET /:id — find by id
router.get('/:id', async (req, res) => {
  const record = await findById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: '行程不存在' });
  }
  if (record.error) {
    return res.status(500).json({ error: record.error });
  }
  return res.status(200).json(record);
});

// POST /:id/share — get or create share token
router.post('/:id/share', async (req, res) => {
  try {
    const token = await getOrCreateShareToken(req.params.id);
    const shareLink = `${req.protocol}://${req.get('host')}/#/share/${token}`;
    return res.status(200).json({ shareToken: token, shareLink });
  } catch (err) {
    if (err.message && err.message.includes('行程不存在')) {
      return res.status(404).json({ error: err.message });
    }
    console.error('[itinerary] share error:', err);
    return res.status(503).json({ error: '服务暂时不可用，请稍后重试' });
  }
});

// GET / — list by deviceId
router.get('/', async (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.status(400).json({ error: '缺少必要参数: deviceId' });
  }
  const items = await findByDeviceId(deviceId);
  return res.status(200).json({ items, total: items.length });
});

export default router;
