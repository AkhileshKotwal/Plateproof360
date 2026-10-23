const express = require('express');
const { db } = require('../../db');
const { verifyOrderToken } = require('../services/qr');
const { complaintSeverity, createIncident } = require('../services/incidentEngine');

const router = express.Router();
const ISSUE_TYPES = new Set(['Undercooked', 'Hygiene issue', 'Foreign object', 'Allergen concern', 'Taste/Spoiled', 'Other']);
const STATUS_LABELS = {
  Open: { status: 'received', label: 'Received' },
  Fixed: { status: 'being_fixed', label: 'Being fixed' },
  Verified: { status: 'verified', label: 'Verified' },
  Closed: { status: 'closed', label: 'Closed' }
};

function getOrderId(token) {
  try {
    return verifyOrderToken(token);
  } catch (error) {
    return { error };
  }
}

function rejectToken(req, res) {
  const verified = getOrderId(req.params.token);
  if (verified.error) {
    res.status(401).json({ error: `Invalid or expired QR token: ${verified.error.message}` });
    return null;
  }
  return verified;
}

router.get('/order/:token', (req, res, next) => {
  const orderId = rejectToken(req, res);
  if (orderId === null) return;
  try {
    const row = db.prepare(
      `SELECT d.name AS dish, o.cook_temp_c, o.cook_time_min, o.hygiene_ok, o.order_number,
              COALESCE((
                SELECT group_concat(allergen_tag, ',') FROM (
                  SELECT DISTINCT ia.allergen_tag
                  FROM dish_ingredients di2
                  JOIN ingredient_allergens ia ON ia.ingredient_id = di2.ingredient_id
                  WHERE di2.dish_id = o.dish_id ORDER BY ia.allergen_tag
                )
              ), '') AS allergens_csv
       FROM orders o JOIN dishes d ON d.id = o.dish_id WHERE o.id = ?`
    ).get(orderId);
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({
      dish: row.dish,
      allergens: row.allergens_csv ? row.allergens_csv.split(',') : [],
      cook_temp_c: row.cook_temp_c,
      cook_time_min: row.cook_time_min,
      hygiene_ok: Boolean(row.hygiene_ok),
      order_number: row.order_number
    });
  } catch (error) {
    next(error);
  }
});

router.post('/order/:token/complaint', (req, res, next) => {
  const orderId = rejectToken(req, res);
  if (orderId === null) return;
  const issueType = typeof req.body.issue_type === 'string' ? req.body.issue_type.trim() : '';
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!ISSUE_TYPES.has(issueType)) return res.status(400).json({ error: 'issue_type must be one of the supported complaint types' });
  if (text.length > 500) return res.status(400).json({ error: 'text must be 500 characters or fewer' });
  try {
    if (!db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId)) return res.status(404).json({ error: 'Order not found' });
    const complaint = db.prepare('INSERT INTO complaints (order_id, issue_type, text) VALUES (?, ?, ?)').run(orderId, issueType, text);
    const complaintId = complaint.lastInsertRowid;
    createIncident({
      type: 'Order complaint',
      severity: complaintSeverity(issueType),
      sourceRef: `complaint:${complaintId}`,
      orderId,
      actor: 'customer',
      role: 'customer',
      note: `${issueType}: ${text || 'No additional details'}`
    });
    res.status(201).json({ complaint_id: complaintId, reference: `PP-${String(complaintId).padStart(6, '0')}` });
  } catch (error) {
    next(error);
  }
});

router.get('/order/:token/complaint-status', (req, res, next) => {
  const orderId = rejectToken(req, res);
  if (orderId === null) return;
  try {
    const row = db.prepare(
      `SELECT i.status, i.assigned_to
       FROM complaints c LEFT JOIN incidents i ON i.source_ref = 'complaint:' || c.id
       WHERE c.order_id = ? ORDER BY c.created_at DESC, c.id DESC LIMIT 1`
    ).get(orderId);
    if (!row) return res.json({ status: 'received', label: 'Received' });
    if (row.status === 'Open' && row.assigned_to) return res.json({ status: 'being_fixed', label: 'Being fixed' });
    res.json(STATUS_LABELS[row.status] || STATUS_LABELS.Open);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
