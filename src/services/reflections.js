import { apiError, request } from './api';

// Fired on window after a reflection is created or updated
export const REFLECTIONS_CHANGED_EVENT = 'athena:reflections-changed';
const announceChange = () => window.dispatchEvent(new Event(REFLECTIONS_CHANGED_EVENT));

// Rows match the reflection table: { reflection_id, week_start, reflection_text, created_at, user_id }

// The user's reflections, newest week first (GET /api/reflections?user_id=...)
export async function listReflections(userId) {
  const { res, data } = await request(`/api/reflections?user_id=${encodeURIComponent(userId)}`);
  if (res.ok) return data;
  throw apiError(res, data, 'Could not load your reflections.');
}

// Saves a new reflection for the week starting on `weekStart` (YYYY-MM-DD)
export async function createReflection(userId, weekStart, text) {
  const { res, data } = await request('/api/reflections', {
    method: 'POST',
    json: { user_id: userId, week_start: weekStart, reflection_text: text.trim() },
  });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not submit your reflection. Please try again.');
}

// Replaces the text of an existing reflection and returns the saved row
export async function updateReflection(reflectionId, text) {
  const { res, data } = await request(`/api/reflections/${reflectionId}`, {
    method: 'PUT',
    json: { reflection_text: text.trim() },
  });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not update your reflection. Please try again.');
}
