const express = require('express');
const pool = require('../db');
const { TASK_STATUSES, missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// GET /api/subtasks?task_id=1
router.get('/', async (req, res) => {
  let sql = 'SELECT * FROM subtask';
  const params = [];
  if (req.query.task_id) {
    sql += ' WHERE task_id = ?';
    params.push(req.query.task_id);
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/subtasks/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM subtask WHERE subtask_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Subtask not found' });
  res.json(rows[0]);
});

// POST /api/subtasks  (create_subtask)
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['title', 'task_id']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { title, status = 'To Do', task_id } = req.body;
  if (!TASK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const [result] = await pool.query('INSERT INTO subtask (title, status, task_id) VALUES (?, ?, ?)', [
    title,
    status,
    task_id,
  ]);
  res.status(201).json({ subtask_id: result.insertId, title, status, task_id });
});

// PUT /api/subtasks/:id  (update_subtask)
router.put('/:id', async (req, res) => {
  if (req.body.status !== undefined && !TASK_STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const { setClause, values } = buildUpdate(req.body, ['title', 'status']);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE subtask SET ${setClause} WHERE subtask_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ message: 'Subtask updated' });
});

// PATCH /api/subtasks/:id/status  (update_subtask_status)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!TASK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const [result] = await pool.query('UPDATE subtask SET status = ? WHERE subtask_id = ?', [
    status,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ message: 'Subtask status updated', subtask_id: Number(req.params.id), status });
});

// DELETE /api/subtasks/:id  (delete_subtask)
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM subtask WHERE subtask_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Subtask not found' });
  res.json({ message: 'Subtask deleted' });
});

module.exports = router;
