const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

require('dotenv').config();

const databasePath = path.join(__dirname, 'plateproof.db');
const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
const complaintColumns = db.prepare('PRAGMA table_info(complaints)').all();
if (complaintColumns.length && !complaintColumns.some((column) => column.name === 'issue_type')) {
  db.exec("ALTER TABLE complaints ADD COLUMN issue_type TEXT NOT NULL DEFAULT 'Other'");
}
const incidentEventColumns = db.prepare('PRAGMA table_info(incident_events)').all();
if (incidentEventColumns.length && !incidentEventColumns.some((column) => column.name === 'actor_role')) {
  db.exec("ALTER TABLE incident_events ADD COLUMN actor_role TEXT NOT NULL DEFAULT 'system'");
}

function close() {
  if (db.open) db.close();
}

module.exports = { db, databasePath, close, fs, path };
