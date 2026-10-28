const fs = require('fs');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const pool = require('../db');
const { missingFields, buildUpdate } = require('../utils');

const router = express.Router();

// Password is never returned to the client
const PUBLIC_COLUMNS = 'user_id, name, email, profile_photo';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

// Profile photos are saved to server/uploads; only the URL path is stored in user.profile_photo.
// The timestamp in the filename gives every upload a new URL, so browsers never show a cached old photo.
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `user-${req.params.id}-${Date.now()}${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    const err = new Error('Invalid file type');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  },
});

async function findPublicUser(id) {
  const [rows] = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM \`user\` WHERE user_id = ?`, [id]);
  return rows[0];
}

// Deletes a previously uploaded photo file; ignores photos that aren't ours or are already gone
function deleteUploadedPhoto(photoPath) {
  if (!photoPath || !photoPath.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(photoPath)), () => {});
}

// At least 8 characters including one symbol (same rule as the Register page)
const isStrongPassword = (pw) => typeof pw === 'string' && pw.length >= 8 && /[^A-Za-z0-9]/.test(pw);

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

// POST /api/users/login  (sign_in) - checks the password against the stored bcrypt hash
router.post('/login', async (req, res) => {
  const missing = missingFields(req.body, ['email', 'password']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const email = String(req.body.email).trim().toLowerCase();
  const [rows] = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, password FROM \`user\` WHERE email = ?`,
    [email]
  );

  // Same response for unknown email and wrong password, so emails can't be probed
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(req.body.password), user.password))) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const { password, ...publicUser } = user;
  res.json(publicUser);
});

// PUT /api/users/:id  (update_user)
router.put('/:id', async (req, res) => {
  const body = { ...req.body };
  if (body.password) body.password = await bcrypt.hash(body.password, 10);
  if (typeof body.name === 'string') body.name = body.name.trim();
  if (typeof body.email === 'string') body.email = body.email.trim().toLowerCase();

  const { setClause, values } = buildUpdate(body, ['name', 'email', 'password', 'profile_photo']);
  if (!setClause) return res.status(400).json({ error: 'No fields to update' });

  const [result] = await pool.query(`UPDATE \`user\` SET ${setClause} WHERE user_id = ?`, [
    ...values,
    req.params.id,
  ]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
  res.json(await findPublicUser(req.params.id));
});

// PUT /api/users/:id/password  (change_password) - requires the current password
router.put('/:id/password', async (req, res) => {
  const missing = missingFields(req.body, ['current_password', 'new_password']);
  if (missing.length) return res.status(400).json({ error: 'Missing fields', fields: missing });

  const { current_password, new_password } = req.body;
  if (!isStrongPassword(new_password)) {
    return res.status(400).json({ error: 'New password must be at least 8 characters and include a symbol' });
  }

  const [rows] = await pool.query('SELECT password FROM `user` WHERE user_id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
  if (!(await bcrypt.compare(String(current_password), rows[0].password))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE `user` SET password = ? WHERE user_id = ?', [hashedPassword, req.params.id]);
  res.json({ message: 'Password updated' });
});

// POST /api/users/:id/photo  (upload_profile_photo) - multipart form with a "photo" file field
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });

  const user = await findPublicUser(req.params.id);
  if (!user) {
    fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'User not found' });
  }

  const photoPath = `/uploads/${req.file.filename}`;
  await pool.query('UPDATE `user` SET profile_photo = ? WHERE user_id = ?', [photoPath, req.params.id]);
  deleteUploadedPhoto(user.profile_photo);
  res.json({ ...user, profile_photo: photoPath });
});

// DELETE /api/users/:id/photo  (remove_profile_photo)
router.delete('/:id/photo', async (req, res) => {
  const user = await findPublicUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await pool.query('UPDATE `user` SET profile_photo = NULL WHERE user_id = ?', [req.params.id]);
  deleteUploadedPhoto(user.profile_photo);
  res.json({ ...user, profile_photo: null });
});

// DELETE /api/users/:id  (delete_user) - cascades to workspaces, tasks, reflections
router.delete('/:id', async (req, res) => {
  const [result] = await pool.query('DELETE FROM `user` WHERE user_id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
});

module.exports = router;
