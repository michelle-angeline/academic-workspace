import { apiError, request } from './api';

// Fired on window after a task is created, updated or deleted
export const TASKS_CHANGED_EVENT = 'athena:tasks-changed';
const announceChange = () => window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));

// Lists a workspace's tasks, earliest deadline first (GET /api/tasks?workspace_id=...).
export async function listTasks(workspaceId) {
  const { res, data } = await request(`/api/tasks?workspace_id=${encodeURIComponent(workspaceId)}`);
  if (res.ok) return data;
  throw apiError(res, data, 'Could not load tasks.');
}

// Creates a task in a workspace (POST /api/tasks) and returns the saved row.
export async function createTask(workspaceId, { title, notes, deadline, priority, status }) {
  const { res, data } = await request('/api/tasks', {
    method: 'POST',
    json: {
      workspace_id: workspaceId,
      title: title.trim(),
      notes: notes.trim() || null,
      deadline: deadline || null,
      priority,
      status,
    },
  });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not create the task. Please try again.');
}

// Saves edits to a task (PUT /api/tasks/:id) and returns the updated row.
export async function updateTask(taskId, { title, notes, deadline, priority, status }) {
  const { res, data } = await request(`/api/tasks/${taskId}`, {
    method: 'PUT',
    json: { title: title.trim(), notes: notes.trim() || null, deadline: deadline || null, priority, status },
  });
  if (res.ok) {
    announceChange();
    return data;
  }
  throw apiError(res, data, 'Could not save the task. Please try again.');
}

// Deletes a task and its subtasks/alerts (DELETE /api/tasks/:id).
export async function deleteTask(taskId) {
  const { res, data } = await request(`/api/tasks/${taskId}`, { method: 'DELETE' });
  if (res.ok) {
    announceChange();
    return;
  }
  throw apiError(res, data, 'Could not delete the task. Please try again.');
}
