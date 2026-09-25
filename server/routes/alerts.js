const express = require('express');
const pool = require('../db');
const { missingFields } = require('../utils');

const router = express.Router();

// GET /api/alerts?task_id=1&is_read=0
router.get('/', async (req, res) => {
  const conditions = [];
  const params = [];
  if (req.query.task_id) {
    conditions.push('task_id = ?');
    params.push(req.query.task_id);
  }
  if (req.query.is_read !== undefined) {
    conditions.push('is_read = ?');
    params.push(req.query.is_read);
  }

  let sql = 'SELECT * FROM alert';
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY alert_time DESC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/alerts/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM alert WHERE alert_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
  res.json(rows[0]);
});

// POST /api/alerts  (create_alert) - later this will mostly be called by the early-alert engine
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['alert_type', 'alert_message', 'task_id']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { alert_type, alert_message, task_id } = req.body;
  const [result] = await pool.query(
    'INSERT INTO alert (alert_type, alert_message, task_id) VALUES (?, ?, ?)',
    [alert_type, alert_message, task_id]
  );
  const [rows] = await pool.query('SELECT * FROM alert WHERE alert_id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PATCH /api/alerts/:id/read  (mark_alert_read)
router.patch('/:id/read', async (req, res) => {
  const isRead = req.body.is_read === undefined ? 1 : req.body.is_read ? 1 : 0;
  const [result] = await pool.query('UPDATE alert SET is_read = ? WHERE alert_id = ?', [
    isRead,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Alert not found' });
  res.json({ message: 'Alert updated', alert_id: Number(req.params.id), is_read: isRead });
});

// DELETE /api/alerts/:id  (delete_alert)
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM alert WHERE alert_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Alert not found' });
  res.json({ message: 'Alert deleted' });
});

module.exports = router;
