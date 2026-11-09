import { useEffect, useState } from 'react';
import { listReflections, REFLECTIONS_CHANGED_EVENT } from '../services/reflections';

// Monday of the current week as YYYY-MM-DD (the reflection table's week_start format)
function currentWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Whether the user has a reflection for the current week.
// Returns null until loaded (or if it can't be loaded). Rechecks after a reflection is submitted.
export default function useReflectionSubmitted(user) {
  const [submitted, setSubmitted] = useState(null);
  const [version, setVersion] = useState(0);
  const userId = user?.user_id;

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    window.addEventListener(REFLECTIONS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(REFLECTIONS_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (userId === undefined) return undefined;
    let cancelled = false;
    const weekStart = currentWeekStart();
    listReflections(userId)
      .then((rows) => !cancelled && setSubmitted(rows.some((r) => String(r.week_start).slice(0, 10) === weekStart)))
      .catch(() => !cancelled && setSubmitted(null));
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  return submitted;
}
