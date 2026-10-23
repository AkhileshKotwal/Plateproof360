const express = require('express');
const { db } = require('../../db');
const { scanStorageItem } = require('./storage');

const router = express.Router();
router.post('/reading', (req, res, next) => {
  if (!process.env.PROBE_API_KEY || req.body.api_key !== process.env.PROBE_API_KEY) return res.status(401).json({ error: 'Invalid probe API key' });
  const station = typeof req.body.station === 'string' ? req.body.station.trim() : '';
  const temp = Number(req.body.temp_c);
  const item = db.prepare('SELECT * FROM storage_items WHERE name = ?').get(station);
  if (!station || !Number.isFinite(temp) || !item) return res.status(400).json({ error: 'station and numeric temp_c for a known storage item are required' });
  db.prepare('UPDATE storage_items SET current_temp_c = ? WHERE id = ?').run(temp, item.id);
  try { res.json({ incident_ids: scanStorageItem({ ...item, current_temp_c: temp }) }); } catch (error) { next(error); }
});

module.exports = router;
