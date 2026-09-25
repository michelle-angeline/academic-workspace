const express = require('express');
const pool = require('../db');
const { missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// GET /api/workspaces?user_id=1
router.get('/', async (req, res) => {
  let sql = 'SELECT * FROM workspace';
  const params = [];
  if (req.query.user_id) {
    sql += ' WHERE user_id = ?';
    params.push(req.query.user_id);
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/workspaces/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM workspace WHERE workspace_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });
  res.json(rows[0]);
});

// POST /api/workspaces  (create_workspace)
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['workspace_name', 'user_id']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { workspace_name, description, user_id } = req.body;
  const [result] = await pool.query(
    'INSERT INTO workspace (workspace_name, description, user_id) VALUES (?, ?, ?)',
    [workspace_name, description || null, user_id]
  );
  res.status(201).json({ workspace_id: result.insertId, workspace_name, description: description || null, user_id });
});

// PUT /api/workspaces/:id  (update_workspace)
router.put('/:id', async (req, res) => {
  const { setClause, values } = buildUpdate(req.body, ['workspace_name', 'description']);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE workspace SET ${setClause} WHERE workspace_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ message: 'Workspace updated' });
});

// DELETE /api/workspaces/:id  (delete_workspace) - cascades to its tasks
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM workspace WHERE workspace_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Workspace not found' });
  res.json({ message: 'Workspace deleted' });
});

module.exports = router;
