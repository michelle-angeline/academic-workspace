import { apiError, request } from './api';

// Each function returns the updated public user record { user_id, name, email, profile_photo }.

export async function updateProfile(userId, { name, email }) {
  const { res, data } = await request(`/api/users/${userId}`, {
    method: 'PUT',
    json: { name: name.trim(), email: email.trim().toLowerCase() },
  });
  if (res.ok) return data;
  if (res.status === 409) throw new Error('Another account already uses this email.');
  throw apiError(res, data, 'Could not save your profile. Please try again.');
}

export async function changePassword(userId, currentPassword, newPassword) {
  const { res, data } = await request(`/api/users/${userId}/password`, {
    method: 'PUT',
    json: { current_password: currentPassword, new_password: newPassword },
  });
  if (res.ok) return data;
  throw apiError(res, data, 'Could not update your password. Please try again.');
}

export async function uploadProfilePhoto(userId, file) {
  const formData = new FormData();
  formData.append('photo', file);
  const { res, data } = await request(`/api/users/${userId}/photo`, { method: 'POST', formData });
  if (res.ok) return data;
  throw apiError(res, data, 'Could not upload your photo. Please try again.');
}

export async function removeProfilePhoto(userId) {
  const { res, data } = await request(`/api/users/${userId}/photo`, { method: 'DELETE' });
  if (res.ok) return data;
  throw apiError(res, data, 'Could not remove your photo. Please try again.');
}
