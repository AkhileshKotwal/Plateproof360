const { db } = require('../../db');
const rules = require('../config/rules');

const TRANSITIONS = {
  Open: ['Fixed'],
  Fixed: ['Verified', 'Open'],
  Verified: ['Closed'],
  Closed: []
};

function complaintSeverity(issueType) {
  return rules.complaintSeverity[issueType] || 'Medium';
}

function createIncident({ type, severity, sourceRef, orderId = null, actor = 'system', role = 'system', note = '' }) {
  return db.transaction(() => {
    const existing = db.prepare(
      'SELECT id FROM incidents WHERE type = ? AND source_ref = ? AND status != ? LIMIT 1'
    ).get(type, sourceRef, 'Closed');
    if (existing) return existing.id;
    const incident = db.prepare(
      `INSERT INTO incidents (type, severity, status, source_ref, order_id)
       VALUES (?, ?, 'Open', ?, ?)`
    ).run(type, severity, sourceRef, orderId);
    addEvent(incident.lastInsertRowid, 'Opened', actor, role, note);
    return incident.lastInsertRowid;
  })();
}

function addEvent(incidentId, action, actor, role, note = '', proofUrl = null) {
  return db.prepare(
    `INSERT INTO incident_events (incident_id, action, actor, actor_role, note, proof_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(incidentId, action, actor, role, note || null, proofUrl || null).lastInsertRowid;
}

function assignIncident(incidentId, assignee, actor, role, note = '') {
  return db.transaction(() => {
    const incident = getIncident(incidentId);
    if (!incident) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
    db.prepare('UPDATE incidents SET assigned_to = ? WHERE id = ?').run(assignee, incidentId);
    addEvent(incidentId, 'Assigned', actor, role, note, null);
    return getIncident(incidentId);
  })();
}

function transitionIncident(incidentId, targetStatus, actor, role, note = '', proofUrl = null) {
  return db.transaction(() => {
    const incident = getIncident(incidentId);
    if (!incident) throw Object.assign(new Error('Incident not found'), { statusCode: 404 });
    if (!TRANSITIONS[incident.status].includes(targetStatus)) {
      throw Object.assign(new Error(`Invalid incident transition from ${incident.status} to ${targetStatus}`), { statusCode: 409 });
    }
    if (targetStatus === 'Verified' && role !== 'supervisor') {
      throw Object.assign(new Error('Only a supervisor can verify an incident'), { statusCode: 403 });
    }
    if (targetStatus === 'Closed' && !['supervisor', 'manager'].includes(role)) {
      throw Object.assign(new Error('Only a supervisor or manager can close an incident'), { statusCode: 403 });
    }
    if (targetStatus === 'Open' && !note.trim()) {
      throw Object.assign(new Error('A rejection note is required'), { statusCode: 400 });
    }
    db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run(targetStatus, incidentId);
    addEvent(incidentId, targetStatus === 'Open' ? 'Rejected' : targetStatus, actor, role, note, proofUrl);
    return getIncident(incidentId);
  })();
}

function getIncident(id) {
  return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
}

module.exports = { addEvent, assignIncident, complaintSeverity, createIncident, getIncident, transitionIncident };
