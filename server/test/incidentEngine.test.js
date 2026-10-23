const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const {
  complaintSeverity,
  createIncident,
  getIncident,
  transitionIncident
} = require('../src/services/incidentEngine');

const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

function reset() {
  for (const table of ['incident_events', 'incidents', 'complaints', 'checklist_logs', 'checklist_items', 'storage_items', 'orders', 'dish_ingredients', 'ingredient_allergens', 'ingredients', 'dishes']) {
    db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
  }
  db.exec(schema);
}

test.beforeEach(reset);

test('allows valid lifecycle transitions and audits each transition', () => {
  const id = createIncident({ type: 'Order complaint', severity: 'Medium', sourceRef: 'complaint:test' });
  transitionIncident(id, 'Fixed', 'Staff', 'staff', 'Fixed');
  transitionIncident(id, 'Verified', 'Supervisor', 'supervisor', 'Verified');
  transitionIncident(id, 'Closed', 'Manager', 'manager', 'Closed');
  const incident = getIncident(id);
  const events = db.prepare('SELECT action, actor_role FROM incident_events WHERE incident_id = ? ORDER BY id').all(id);
  assert.equal(incident.status, 'Closed');
  assert.deepEqual(events.map((event) => event.action), ['Opened', 'Fixed', 'Verified', 'Closed']);
  assert.deepEqual(events.map((event) => event.actor_role), ['system', 'staff', 'supervisor', 'manager']);
});

test('rejects invalid transitions and non-supervisor verification', () => {
  const id = createIncident({ type: 'Hygiene failure', severity: 'Medium', sourceRef: 'checklist:test' });
  assert.throws(() => transitionIncident(id, 'Verified', 'Staff', 'staff'), (error) => error.statusCode === 409);
  transitionIncident(id, 'Fixed', 'Staff', 'staff');
  assert.throws(() => transitionIncident(id, 'Verified', 'Manager', 'manager'), (error) => error.statusCode === 403);
  assert.throws(() => transitionIncident(id, 'Open', 'Supervisor', 'supervisor'), (error) => error.statusCode === 400);
});

test('deduplicates active incidents and preserves a new incident after closure', () => {
  const first = createIncident({ type: 'Cooking temperature', severity: 'High', sourceRef: 'order:1:cooking-temperature' });
  const duplicate = createIncident({ type: 'Cooking temperature', severity: 'High', sourceRef: 'order:1:cooking-temperature' });
  assert.equal(first, duplicate);
  transitionIncident(first, 'Fixed', 'Staff', 'staff');
  transitionIncident(first, 'Verified', 'Supervisor', 'supervisor');
  transitionIncident(first, 'Closed', 'Supervisor', 'supervisor');
  const afterClose = createIncident({ type: 'Cooking temperature', severity: 'High', sourceRef: 'order:1:cooking-temperature' });
  assert.notEqual(afterClose, first);
});

test('maps complaint severity rules', () => {
  assert.equal(complaintSeverity('Allergen concern'), 'High');
  assert.equal(complaintSeverity('Foreign object'), 'Medium');
  assert.equal(complaintSeverity('Undercooked'), 'Medium');
  assert.equal(complaintSeverity('Other'), 'Medium');
});
