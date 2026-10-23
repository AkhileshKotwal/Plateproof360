const express = require('express');
const { issueDemoToken } = require('../middleware/auth');

const router = express.Router();
const roles = new Set(['staff', 'supervisor', 'manager']);

router.post('/demo-login', (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
  if (!name || !roles.has(role)) return res.status(400).json({ error: 'name and role (staff, supervisor, manager) are required' });
  res.json({ token: issueDemoToken(name, role), name, role });
});

module.exports = router;
