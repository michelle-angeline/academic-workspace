import { apiError, request } from './api';

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
  if (res.ok) return data;
  throw apiError(res, data, 'Could not create the task. Please try again.');
}
