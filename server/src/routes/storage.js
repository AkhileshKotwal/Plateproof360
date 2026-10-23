const express = require('express');
const { db } = require('../../db');
const rules = require('../config/rules');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createIncident } = require('../services/incidentEngine');

const router = express.Router();
router.use(requireAuth, requireRoles('staff', 'supervisor', 'manager'));

router.get('/items', (req, res) => {
  res.json({ items: db.prepare('SELECT * FROM storage_items ORDER BY expiry_date, name').all() });
});

function scanStorageItem(item, actor = 'system', role = 'system') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${item.expiry_date}T00:00:00`);
  const days = Math.ceil((expiry - today) / 86400000);
  const incidents = [];
  if (item.current_temp_c > item.temp_limit_c) incidents.push(createIncident({
    type: 'Storage temperature', severity: 'High', sourceRef: `storage:${item.id}:temperature`,
    actor, role, note: `${item.name} is at ${item.current_temp_c}°C; limit is ${item.temp_limit_c}°C`
  }));
  if (days < 0) incidents.push(createIncident({
    type: 'Expired storage item', severity: 'Critical', sourceRef: `storage:${item.id}:expiry`,
    actor, role, note: `${item.name} expired on ${item.expiry_date}`
  }));
  else if (days <= rules.STORAGE_EXPIRY_WARNING_DAYS) incidents.push(createIncident({
    type: 'Expiring storage item', severity: 'Medium', sourceRef: `storage:${item.id}:expiry`,
    actor, role, note: `${item.name} expires on ${item.expiry_date}`
  }));
  return incidents;
}

router.post('/scan', (req, res, next) => {
  try {
    const items = db.prepare('SELECT * FROM storage_items').all();
    const incidents = items.flatMap((item) => scanStorageItem(item, req.user.name, req.user.role));
    res.status(201).json({ incident_ids: incidents });
  } catch (error) { next(error); }
});

router.post('/:id/reading', (req, res, next) => {
  try {
    const temp = Number(req.body.current_temp_c);
    if (!Number.isFinite(temp)) return res.status(400).json({ error: 'current_temp_c must be a number' });
    const item = db.prepare('SELECT * FROM storage_items WHERE id = ?').get(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Storage item not found' });
    db.prepare('UPDATE storage_items SET current_temp_c = ? WHERE id = ?').run(temp, item.id);
    const updated = db.prepare('SELECT * FROM storage_items WHERE id = ?').get(item.id);
    res.json({ storage_item: updated, incident_ids: scanStorageItem(updated, req.user.name, req.user.role) });
  } catch (error) { next(error); }
});

module.exports = { router, scanStorageItem };
