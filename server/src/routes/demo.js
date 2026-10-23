const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../../db');
const { requireAuth, requireRoles } = require('../middleware/auth');
const { resetStorageItems } = require('../../db/seed');

const router = express.Router();

router.post('/reset', requireAuth, requireRoles('manager'), (req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(403).json({ error: 'Demo reset is disabled in production' });
  try {
    const reset = db.transaction(() => {
      db.prepare('DELETE FROM incident_events').run();
      db.prepare('DELETE FROM incidents').run();
      db.prepare('DELETE FROM complaints').run();
      db.prepare('DELETE FROM checklist_logs').run();
      db.prepare('DELETE FROM orders').run();
      db.prepare('DELETE FROM storage_items').run();
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?, ?)').run('orders', 'complaints', 'incidents', 'incident_events', 'checklist_logs');
      resetStorageItems();
    });
    reset();
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (fs.existsSync(uploadDir)) {
      for (const file of fs.readdirSync(uploadDir)) fs.unlinkSync(path.join(uploadDir, file));
    }
    res.json({ reset: true, message: 'Demo data reset successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
