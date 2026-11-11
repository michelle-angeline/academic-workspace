import { apiError, request } from './api';

// Fired on window after an alert is marked read/unread
export const ALERTS_CHANGED_EVENT = 'athena:alerts-changed';
const announceChange = () => window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));

// Runs the early-alert engine on the server, which saves the user's alerts to the alert table,
// and returns them (POST /api/alerts/sync). Each alert has its task row, workspace_name,
// kind ('overdue' | 'due' | 'inactive' | 'priority') and days.
export async function syncAlerts(userId) {
  const { res, data } = await request('/api/alerts/sync', { method: 'POST', json: { user_id: userId } });
  if (res.ok) return data;
  throw apiError(res, data, 'Could not load alerts.');
}

// Marks one alert read or unread (PATCH /api/alerts/:id/read).
export async function setAlertRead(alertId, isRead) {
  const { res, data } = await request(`/api/alerts/${alertId}/read`, {
    method: 'PATCH',
    json: { is_read: isRead },
  });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not update the alert.');
}

// Marks all of the user's alerts as read (PATCH /api/alerts/read-all).
export async function markAllAlertsRead(userId) {
  const { res, data } = await request('/api/alerts/read-all', { method: 'PATCH', json: { user_id: userId } });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not mark the alerts as read.');
}
