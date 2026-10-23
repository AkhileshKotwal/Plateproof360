const express = require('express');
const { db } = require('../../db');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createIncident } = require('../services/incidentEngine');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => res.json({ items: db.prepare('SELECT * FROM checklist_items ORDER BY id').all() }));

router.post('/log', requireRoles('staff', 'supervisor', 'manager'), (req, res, next) => {
  try {
    if (!Array.isArray(req.body.items) || typeof req.body.logged_by !== 'string' || !req.body.logged_by.trim()) {
      return res.status(400).json({ error: 'items and logged_by are required' });
    }
    const results = [];
    for (const item of req.body.items) {
      const checklist = db.prepare('SELECT id FROM checklist_items WHERE id = ?').get(Number(item.item_id));
      if (!checklist || typeof item.passed !== 'boolean') return res.status(400).json({ error: 'Each item_id must exist and passed must be boolean' });
      const log = db.prepare('INSERT INTO checklist_logs (checklist_item_id, checked_by, passed) VALUES (?, ?, ?)')
        .run(checklist.id, req.body.logged_by.trim(), item.passed ? 1 : 0);
      if (!item.passed) createIncident({
        type: 'Hygiene failure',
        severity: 'Medium',
        sourceRef: `checklist:${log.lastInsertRowid}`,
        actor: req.user.name,
        role: req.user.role,
        note: `Failed checklist item ${checklist.id}`
      });
      results.push(log.lastInsertRowid);
    }
    res.status(201).json({ log_ids: results });
  } catch (error) { next(error); }
});

module.exports = router;
