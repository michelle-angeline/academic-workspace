// The four deterministic early-alert rules, shared by the Workspace board and the Early Alerts page.

export const DAY = 24 * 60 * 60 * 1000;
export const DUE_SOON_DAYS = 3;
export const INACTIVE_DAYS = 7;

// Rule keys in priority order (the board shows the first match; the alerts page shows them all)
export const RULE_ORDER = ['overdue', 'due', 'inactive', 'priority'];

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// MySQL DATETIME strings ("2026-11-10 00:00:00") -> local Date
export const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

// Whole days from `today` to `date` (negative when `date` is in the past)
export const daysUntil = (date, today = startOfToday()) => Math.round((date - today) / DAY);

// Returns every rule a task matches, in RULE_ORDER, as [{ kind, days }].
// `task` needs: status, priority, deadline (Date | null), lastActivity (Date).
export function matchRules(task, today = startOfToday()) {
  if (task.status === 'Done') return [];
  const matches = [];

  const days = task.deadline ? daysUntil(task.deadline, today) : null;
  if (days !== null && days < 0) matches.push({ kind: 'overdue', days: -days });
  else if (days !== null && days <= DUE_SOON_DAYS) matches.push({ kind: 'due', days });

  const idle = -daysUntil(task.lastActivity, today);
  if ((task.status === 'In Progress' || task.status === 'Review') && idle >= INACTIVE_DAYS) {
    matches.push({ kind: 'inactive', days: idle });
  }

  if (task.priority === 'High' && task.status === 'To Do') matches.push({ kind: 'priority' });
  return matches;
}
