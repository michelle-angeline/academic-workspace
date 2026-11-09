const express = require('express');
const pool = require('../db');
const { missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// GET /api/reflections?user_id=1
router.get('/', async (req, res) => {
  let sql = 'SELECT * FROM reflection';
  const params = [];
  if (req.query.user_id) {
    sql += ' WHERE user_id = ?';
    params.push(req.query.user_id);
  }
  sql += ' ORDER BY week_start DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/reflections/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM reflection WHERE reflection_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Reflection not found' });
  res.json(rows[0]);
});

// POST /api/reflections  (create_reflection)
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['week_start', 'reflection_text', 'user_id']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { week_start, user_id } = req.body;
  const reflection_text = String(req.body.reflection_text).trim();
  if (!reflection_text) return res.status(400).json({ error: 'reflection_text cannot be empty' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week_start)) return res.status(400).json({ error: 'week_start must be YYYY-MM-DD' });

  const [result] = await pool.query(
    'INSERT INTO reflection (week_start, reflection_text, user_id) VALUES (?, ?, ?)',
    [week_start, reflection_text, user_id]
  );
  const [rows] = await pool.query('SELECT * FROM reflection WHERE reflection_id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/reflections/:id  (update_reflection)
router.put('/:id', async (req, res) => {
  const body = { ...req.body };
  if (body.reflection_text !== undefined) {
    body.reflection_text = String(body.reflection_text).trim();
    if (!body.reflection_text) return res.status(400).json({ error: 'reflection_text cannot be empty' });
  }

  const { setClause, values } = buildUpdate(body, ['week_start', 'reflection_text']);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE reflection SET ${setClause} WHERE reflection_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Reflection not found' });
  const [rows] = await pool.query('SELECT * FROM reflection WHERE reflection_id = ?', [req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/reflections/:id  (delete_reflection)
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM reflection WHERE reflection_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Reflection not found' });
  res.json({ message: 'Reflection deleted' });
});

module.exports = router;
