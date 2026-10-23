const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../../db');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { assignIncident, transitionIncident } = require('../services/incidentEngine');

const router = express.Router();
fs.mkdirSync(path.join(__dirname, '..', '..', 'uploads'), { recursive: true });
const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!/^image\//.test(file.mimetype)) return callback(Object.assign(new Error('proof must be an image'), { statusCode: 400 }));
    callback(null, true);
  }
});

router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const filters = [];
    const values = [];
    if (req.query.status) { filters.push('i.status = ?'); values.push(req.query.status); }
    if (req.query.severity) { filters.push('i.severity = ?'); values.push(req.query.severity); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const incidents = db.prepare(
      `SELECT i.*, o.order_number, d.name AS dish_name, o.cook_temp_c, o.cook_time_min, o.hygiene_ok,
              c.issue_type AS complaint_issue_type, c.text AS complaint_text
       FROM incidents i
       LEFT JOIN orders o ON o.id = i.order_id
       LEFT JOIN dishes d ON d.id = o.dish_id
       LEFT JOIN complaints c ON c.id = CAST(REPLACE(i.source_ref, 'complaint:', '') AS INTEGER)
       ${where} ORDER BY i.created_at DESC`
    ).all(...values);
    res.json({ incidents });
  } catch (error) { next(error); }
});

router.get('/:id', (req, res, next) => {
  try {
    const incident = db.prepare(
      `SELECT i.*, o.order_number, d.name AS dish_name, o.cook_temp_c, o.cook_time_min, o.hygiene_ok,
              c.issue_type AS complaint_issue_type, c.text AS complaint_text
       FROM incidents i LEFT JOIN orders o ON o.id = i.order_id
       LEFT JOIN dishes d ON d.id = o.dish_id
       LEFT JOIN complaints c ON c.id = CAST(REPLACE(i.source_ref, 'complaint:', '') AS INTEGER)
       WHERE i.id = ?`
    ).get(Number(req.params.id));
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    incident.events = db.prepare('SELECT * FROM incident_events WHERE incident_id = ? ORDER BY created_at, id').all(incident.id);
    res.json(incident);
  } catch (error) { next(error); }
});

router.post('/:id/assign', requireRoles('staff', 'supervisor', 'manager'), (req, res, next) => {
  try {
    const assignee = typeof req.body.assignee === 'string' ? req.body.assignee.trim() : '';
    if (!assignee) return res.status(400).json({ error: 'assignee is required' });
    res.json(assignIncident(Number(req.params.id), assignee, req.user.name, req.user.role, req.body.note || ''));
  } catch (error) { next(error); }
});

router.post('/:id/fix', requireRoles('staff', 'supervisor', 'manager'), upload.single('proof'), (req, res, next) => {
  try {
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;
    res.json(transitionIncident(Number(req.params.id), 'Fixed', req.user.name, req.user.role, req.body.note || '', proofUrl));
  } catch (error) { next(error); }
});

router.post('/:id/verify', requireRoles('supervisor'), (req, res, next) => {
  try { res.json(transitionIncident(Number(req.params.id), 'Verified', req.user.name, req.user.role, req.body.note || '')); }
  catch (error) { next(error); }
});

router.post('/:id/reject', requireRoles('supervisor'), (req, res, next) => {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!note) return res.status(400).json({ error: 'A rejection note is required' });
    res.json(transitionIncident(Number(req.params.id), 'Open', req.user.name, req.user.role, note));
  } catch (error) { next(error); }
});

router.post('/:id/close', requireRoles('supervisor', 'manager'), (req, res, next) => {
  try { res.json(transitionIncident(Number(req.params.id), 'Closed', req.user.name, req.user.role, req.body.note || '')); }
  catch (error) { next(error); }
});

module.exports = router;
