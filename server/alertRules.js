// The four deterministic early-alert rules (server copy of src/utils/alertRules.js - keep both in sync).

const DAY = 24 * 60 * 60 * 1000;
const DUE_SOON_DAYS = 3;
const INACTIVE_DAYS = 7;

// Rule keys in priority order, and the value stored in alert.alert_type for each
const ALERT_TYPES = {
  overdue: 'Overdue',
  due: 'Due Soon',
  inactive: 'Inactive',
  priority: 'High Priority',
};
const RULE_ORDER = Object.keys(ALERT_TYPES);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// MySQL DATETIME strings ("2026-11-10 00:00:00") -> local Date
const parseDate = (value) => (value ? new Date(String(value).replace(' ', 'T')) : null);

const daysUntil = (date, today) => Math.round((date - today) / DAY);

// Returns every rule a task row matches, in RULE_ORDER, as [{ kind, days }]
function matchRules(row, today = startOfToday()) {
  if (row.status === 'Done') return [];
  const matches = [];

  const deadline = parseDate(row.deadline);
  const days = deadline ? daysUntil(deadline, today) : null;
  if (days !== null && days < 0) matches.push({ kind: 'overdue', days: -days });
  else if (days !== null && days <= DUE_SOON_DAYS) matches.push({ kind: 'due', days });

  const idle = -daysUntil(parseDate(row.updated_at || row.created_at), today);
  if ((row.status === 'In Progress' || row.status === 'Review') && idle >= INACTIVE_DAYS) {
    matches.push({ kind: 'inactive', days: idle });
  }

  if (row.priority === 'High' && row.status === 'To Do') matches.push({ kind: 'priority', days: null });
  return matches;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Nov 9, 2026", plus the time when it isn't midnight
function formatDate(date) {
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!date.getHours() && !date.getMinutes()) return day;
  return `${day}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

// The alert_message stored for a matched rule (the trigger reason shown on the alert card)
function alertMessage(kind, days, row) {
  const deadline = row.deadline ? formatDate(parseDate(row.deadline)) : null;
  let message;
  switch (kind) {
    case 'overdue':
      message = `Deadline passed ${plural(days, 'day')} ago and the task is still in '${row.status}'.`;
      break;
    case 'due': {
      const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
      message = `Target deadline is ${when} (${deadline}) and the task is still in '${row.status}'.`;
      break;
    }
    case 'inactive':
      message = `In '${row.status}' with no updates to the task for ${plural(days, 'day')}.`;
      break;
    default:
      message = `Marked High priority but still in 'To Do'${deadline ? `, with the deadline on ${deadline}` : ''}.`;
  }
  return message.slice(0, 255);
}

module.exports = { ALERT_TYPES, RULE_ORDER, matchRules, alertMessage };
