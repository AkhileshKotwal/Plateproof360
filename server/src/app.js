require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const dishes = require('./routes/dishes');
const orders = require('./routes/orders');
const publicRoutes = require('./routes/public');
const auth = require('./routes/auth');
const incidents = require('./routes/incidents');
const checklist = require('./routes/checklist');
const storage = require('./routes/storage');
const probe = require('./routes/probe');
const demo = require('./routes/demo');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'plateproof-360-api' }));
app.use('/api/dishes', dishes);
app.use('/api/orders', orders);
app.use('/api/public', publicRoutes);
app.use('/api/auth', auth);
app.use('/api/incidents', incidents);
app.use('/api/checklist', checklist);
app.use('/api/storage', storage.router);
app.use('/api/probe', probe);
app.use('/api/demo', demo);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((error, req, res, next) => {
  console.error(error);
  const statusCode = error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
  const message = error.statusCode || error.code === 'LIMIT_FILE_SIZE' ? error.message || 'Uploaded proof must be 5 MB or smaller' : 'Internal server error';
  res.status(statusCode).json({ error: message });
});

const port = Number(process.env.PORT || 4000);
if (require.main === module) app.listen(port, () => console.log(`PlateProof 360 API listening on port ${port}`));

module.exports = app;
