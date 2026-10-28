const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ quiet: true });
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
// Express 5 leaves req.body undefined when no JSON body is sent
app.use((req, res, next) => {
  req.body = req.body || {};
  next();
});

// Uploaded profile photos, e.g. /uploads/user-5-1730000000000.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Quick check that the API can reach the database
app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
});

app.use('/api/users', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/subtasks', require('./routes/subtasks'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reflections', require('./routes/reflections'));

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler: turns common MySQL errors into readable responses
app.use((err, req, res, next) => {
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referenced record (foreign key) does not exist' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate value', detail: err.sqlMessage });
  }
  if (err.code === 'WARN_DATA_TRUNCATED' || err.code === 'ER_TRUNCATED_WRONG_VALUE') {
    return res.status(400).json({ error: 'Invalid value', detail: err.sqlMessage });
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_BAD_DB_ERROR') {
    return res.status(503).json({ error: 'Database unavailable', detail: err.code });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Photo must be 2 MB or smaller' });
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: 'Photo must be a JPG, PNG, WEBP or GIF image' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`API running on http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log('Connected to MySQL database:', process.env.DB_NAME);
  } catch (err) {
    console.error('Could not connect to MySQL:', err.code, err.message);
    console.error('Check that MySQL is running and the settings in server/.env are correct.');
  }
});
