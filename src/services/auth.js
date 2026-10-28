import { apiError, request } from './api';

// Checks the email and password against the user table (POST /api/users/login).
export async function signIn(email, password) {
  const { res, data } = await request('/api/users/login', {
    method: 'POST',
    json: { email: email.trim().toLowerCase(), password },
  });
  if (res.ok) return data;

  if (res.status === 401) {
    throw new Error('Incorrect email or password. Please check your credentials and try again.');
  }
  throw apiError(res, data, 'Sign in failed. Please try again.');
}

// Creates the account in MySQL (POST /api/users).
export async function signUp({ fullName, email, password }) {
  const { res, data } = await request('/api/users', {
    method: 'POST',
    json: { name: fullName.trim(), email: email.trim().toLowerCase(), password },
  });
  if (res.ok) return data;

  if (res.status === 409) throw new Error('An account with this email already exists.');
  throw apiError(res, data, 'Registration failed. Please try again.');
}
