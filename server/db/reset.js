const fs = require('fs');
const path = require('path');
const databasePath = path.join(__dirname, 'plateproof.db');

try {
  if (fs.existsSync(databasePath)) fs.unlinkSync(databasePath);
  const { db, close } = require('./index');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  const { seed } = require('./seed');
  seed();
  close();
} catch (error) {
  console.error('Database reset failed:', error.message);
  process.exitCode = 1;
}
