const express = require('express');
const pool = require('../db');
const { missingFields } = require('../utils');
const { ALERT_TYPES, RULE_ORDER, matchRules, alertMessage } = require('../alertRules');

const router = express.Router();

const KIND_BY_TYPE = Object.fromEntries(Object.entries(ALERT_TYPES).map(([kind, type]) => [type, kind]));

// Brings the alert table in line with the user's tasks: inserts an alert for every newly
// matched rule, refreshes the message of existing ones (keeping is_read and alert_time),
// and deletes alerts whose rule no longer applies. Returns the user's current alerts.
async function syncAlerts(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [tasks] = await pool.query(
    `SELECT t.*, w.workspace_name
       FROM task t JOIN workspace w ON w.workspace_id = t.workspace_id
      WHERE w.user_id = ?`,
    [userId]
  );
  const [existing] = await pool.query(
    `SELECT a.* FROM alert a
       JOIN task t ON t.task_id = a.task_id
       JOIN workspace w ON w.workspace_id = t.workspace_id
      WHERE w.user_id = ?`,
    [userId]
  );

  // What should exist right now, keyed by "task_id|alert_type"
  const wanted = new Map();
  for (const task of tasks) {
    for (const { kind, days } of matchRules(task, today)) {
      wanted.set(`${task.task_id}|${ALERT_TYPES[kind]}`, { task, kind, days, message: alertMessage(kind, days, task) });
    }
  }

  const kept = new Set();
  const staleIds = [];
  for (const alert of existing) {
    const key = `${alert.task_id}|${alert.alert_type}`;
    const want = wanted.get(key);
    if (!want || kept.has(key)) {
      staleIds.push(alert.alert_id);
      continue;
    }
    kept.add(key);
    if (alert.alert_message !== want.message) {
      await pool.query('UPDATE alert SET alert_message = ? WHERE alert_id = ?', [want.message, alert.alert_id]);
    }
  }
  if (staleIds.length) await pool.query('DELETE FROM alert WHERE alert_id IN (?)', [staleIds]);

  const toInsert = [...wanted].filter(([key]) => !kept.has(key));
  if (toInsert.length) {
    await pool.query('INSERT INTO alert (alert_type, alert_message, task_id) VALUES ?', [
      toInsert.map(([, w]) => [ALERT_TYPES[w.kind], w.message, w.task.task_id]),
    ]);
  }

  const [rows] = await pool.query(
    `SELECT a.* FROM alert a
       JOIN task t ON t.task_id = a.task_id
       JOIN workspace w ON w.workspace_id = t.workspace_id
      WHERE w.user_id = ?`,
    [userId]
  );
  const rank = (row) => RULE_ORDER.indexOf(KIND_BY_TYPE[row.alert_type]);
  return rows
    .map((row) => {
      const want = wanted.get(`${row.task_id}|${row.alert_type}`);
      const { workspace_name, ...task } = want.task;
      return { ...row, kind: want.kind, days: want.days, task, workspace_name };
    })
    .sort((a, b) => rank(a) - rank(b) || a.alert_id - b.alert_id);
}

// One sync at a time per user, so two pages syncing together can't insert the same alert twice
const syncQueues = new Map();
function syncAlertsQueued(userId) {
  const run = (syncQueues.get(userId) || Promise.resolve()).catch(() => {}).then(() => syncAlerts(userId));
  syncQueues.set(userId, run);
  run.finally(() => syncQueues.get(userId) === run && syncQueues.delete(userId)).catch(() => {});
  return run;
}

// POST /api/alerts/sync  { user_id }  - runs the early-alert engine and returns the user's alerts,
// each with its task row, workspace_name, the rule key (kind) and day count (days)
router.post('/sync', async (req, res) => {
  const userId = Number(req.body.user_id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'user_id is required' });
  res.json(await syncAlertsQueued(userId));
});

// PATCH /api/alerts/read-all  { user_id }  - marks every alert of the user as read
router.patch('/read-all', async (req, res) => {
  const userId = Number(req.body.user_id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: 'user_id is required' });
  const [result] = await pool.query(
    `UPDATE alert a
       JOIN task t ON t.task_id = a.task_id
       JOIN workspace w ON w.workspace_id = t.workspace_id
        SET a.is_read = 1
      WHERE w.user_id = ? AND a.is_read = 0`,
    [userId]
  );
  res.json({ message: 'Alerts marked as read', updated: result.affectedRows });
});

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
