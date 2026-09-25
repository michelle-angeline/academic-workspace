const express = require('express');
const pool = require('../db');
const { TASK_STATUSES, PRIORITIES, missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// GET /api/tasks?workspace_id=1&status=To Do&priority=High&search=essay
router.get('/', async (req, res) => {
  const conditions = [];
  const params = [];
  if (req.query.workspace_id) {
    conditions.push('workspace_id = ?');
    params.push(req.query.workspace_id);
  }
  if (req.query.status) {
    conditions.push('status = ?');
    params.push(req.query.status);
  }
  if (req.query.priority) {
    conditions.push('priority = ?');
    params.push(req.query.priority);
  }
  if (req.query.search) {
    conditions.push('(title LIKE ? OR notes LIKE ?)');
    params.push(`%${req.query.search}%`, `%${req.query.search}%`);
  }

  let sql = 'SELECT * FROM task';
  if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY deadline IS NULL, deadline ASC';

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/tasks/:id  (includes its subtasks)
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM task WHERE task_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });

  const [subtasks] = await pool.query('SELECT * FROM subtask WHERE task_id = ?', [req.params.id]);
  res.json({ ...rows[0], subtasks });
});

// POST /api/tasks  (create_task)
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['title', 'workspace_id']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { title, notes, deadline, priority = 'Medium', status = 'To Do', workspace_id } = req.body;
  if (!PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }
  if (!TASK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const [result] = await pool.query(
    'INSERT INTO task (title, notes, deadline, priority, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?)',
    [title, notes || null, deadline || null, priority, status, workspace_id]
  );
  const [rows] = await pool.query('SELECT * FROM task WHERE task_id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/tasks/:id  (update_task)
router.put('/:id', async (req, res) => {
  const { priority, status } = req.body;
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of: ${PRIORITIES.join(', ')}` });
  }
  if (status !== undefined && !TASK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const { setClause, values } = buildUpdate(req.body, [
    'title',
    'notes',
    'deadline',
    'priority',
    'status',
    'workspace_id',
  ]);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE task SET ${setClause} WHERE task_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task updated' });
});

// PATCH /api/tasks/:id/status  (update_status) - used when a card is moved on the Kanban board
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!TASK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${TASK_STATUSES.join(', ')}` });
  }

  const [result] = await pool.query('UPDATE task SET status = ? WHERE task_id = ?', [
    status,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task status updated', task_id: Number(req.params.id), status });
});

// DELETE /api/tasks/:id  (delete_task) - cascades to its subtasks and alerts
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM task WHERE task_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted' });
});

module.exports = router;
