import { useEffect, useState } from 'react';
import { listTasks, TASKS_CHANGED_EVENT } from '../services/tasks';
import { matchRules, parseDate } from '../utils/alertRules';

// Counts the early alerts across all of the user's workspaces (same rules as the Early Alerts page).
// Returns null until the tasks have loaded (or if they can't be loaded).
// Recounts whenever the workspace list changes or a task is created, edited or deleted.
export default function useAlertCount(workspaces) {
  const [count, setCount] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(TASKS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (!workspaces) return undefined;
    let cancelled = false;
    Promise.all(workspaces.map((w) => listTasks(w.workspace_id)))
      .then((lists) => {
        if (cancelled) return;
        const total = lists.flat().reduce(
          (sum, row) =>
            sum +
            matchRules({
              status: row.status,
              priority: row.priority,
              deadline: parseDate(row.deadline),
              lastActivity: parseDate(row.updated_at || row.created_at),
            }).length,
          0
        );
        setCount(total);
      })
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, [workspaces, version]);

  return count;
}
