import { useEffect, useState } from 'react';
import { syncAlerts } from '../services/alerts';
import { TASKS_CHANGED_EVENT } from '../services/tasks';

// Counts the user's early alerts. The server runs the alert rules and saves the results to the
// alert table (same data as the Early Alerts page). Returns null until loaded (or on failure).
// Recounts whenever the workspace list changes or a task is created, edited or deleted.
export default function useAlertCount(user, workspaces) {
  const [count, setCount] = useState(null);
  const [version, setVersion] = useState(0);
  const userId = user?.user_id;

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(TASKS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!userId || !workspaces) return undefined;
    let cancelled = false;
    syncAlerts(userId)
      .then((alerts) => !cancelled && setCount(alerts.length))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, [userId, workspaces, version]);

  return count;
}
