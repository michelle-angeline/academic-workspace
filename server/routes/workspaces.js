const express = require('express');
const pool = require('../db');
const { missingFields, buildUpdate } = require('../utils');

const UPDATABLE_FIELDS = ['workspace_name', 'description'];

// Trims the text fields and turns an empty description into NULL. Returns { values } or { error }.
function cleanWorkspace(body) {
  const values = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] === undefined) continue;
    let value = body[field];
    if (typeof value === 'string') value = value.trim();
    if (field === 'description' && value === '') value = null;
    values[field] = value;
  }

  if (values.workspace_name !== undefined && !values.workspace_name) return { error: 'workspace_name cannot be empty' };
  if (values.workspace_name?.length > 150) return { error: 'workspace_name must be 150 characters or fewer' };
  return { values };
}

const router = express.Router();

// GET /api/workspaces?user_id=1
router.get('/', async (req, res) => {
  let sql = 'SELECT * FROM workspace';
  const params = [];
  if (req.query.user_id) {
    sql += ' WHERE user_id = ?';
    params.push(req.query.user_id);
  }
  sql += ' ORDER BY workspace_id';
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

  const { values, error } = cleanWorkspace(req.body);
  if (error) return res.status(400).json({ error });

  const columns = [...Object.keys(values), 'user_id'];
  const [result] = await pool.query(
    `INSERT INTO workspace (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    [...Object.values(values), req.body.user_id]
  );
  const [rows] = await pool.query('SELECT * FROM workspace WHERE workspace_id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
});

// PUT /api/workspaces/:id  (update_workspace)
router.put('/:id', async (req, res) => {
  const cleaned = cleanWorkspace(req.body);
  if (cleaned.error) return res.status(400).json({ error: cleaned.error });

  const { setClause, values } = buildUpdate(cleaned.values, UPDATABLE_FIELDS);
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
