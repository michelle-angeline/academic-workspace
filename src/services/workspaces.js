import { apiError, request } from './api';

// Creates a workspace owned by the user (POST /api/workspaces) and returns the saved row.
export async function createWorkspace(userId, workspace) {
  const { res, data } = await request('/api/workspaces', {
    method: 'POST',
    json: { ...workspace, user_id: userId },
  });
  if (res.ok) return data;
  throw apiError(res, data, 'Could not create the workspace. Please try again.');
}

// Lists the user's workspaces, oldest first (GET /api/workspaces?user_id=...).
export async function listWorkspaces(userId) {
  const { res, data } = await request(`/api/workspaces?user_id=${encodeURIComponent(userId)}`);
  if (res.ok) return data;
  throw apiError(res, data, 'Could not load your workspaces.');
}
