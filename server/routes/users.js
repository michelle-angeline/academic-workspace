const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// Password is never returned to the client
const PUBLIC_COLUMNS = 'user_id, name, email, profile_photo';

// GET /api/users
router.get('/', async (req, res) => {
  const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM \`user\``);
  res.json(rows);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM \`user\` WHERE user_id = ?`, [
    req.params.id,
  ]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

// POST /api/users  (create_user)
router.post('/', async (req, res) => {
  const missing = missingFields(req.body, ['name', 'email', 'password']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { name, email, password, profile_photo } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO `user` (name, email, password, profile_photo) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, profile_photo || null]
  );
  res.status(201).json({ user_id: result.insertId, name, email, profile_photo: profile_photo || null });
});

// PUT /api/users/:id  (update_user)
router.put('/:id', async (req, res) => {
  const body = { ...req.body };
  if (body.password) body.password = await bcrypt.hash(body.password, 10);

  const { setClause, values } = buildUpdate(body, ['name', 'email', 'password', 'profile_photo']);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE \`user\` SET ${setClause} WHERE user_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User updated' });
});

// DELETE /api/users/:id  (delete_user) - cascades to workspaces, tasks, reflections
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM `user` WHERE user_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
