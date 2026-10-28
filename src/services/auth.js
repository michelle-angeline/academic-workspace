// Talks to the API in server/. The "proxy" setting in package.json forwards
// /api requests to http://localhost:5000.

async function postJson(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch {
    throw new Error('Could not reach the server. Make sure the API is running.');
  }
}

// Checks the email and password against the user table (POST /api/users/login).
export async function signIn(email, password) {
  const { res, data } = await postJson('/api/users/login', {
    email: email.trim().toLowerCase(),
    password,
  });
  if (res.ok) return data;

  if (res.status === 401) {
    throw new Error('Incorrect email or password. Please check your credentials and try again.');
  }
  if (res.status === 503) throw new Error('The database is unavailable. Please try again later.');
  throw new Error(data.error || 'Sign in failed. Please try again.');
}

// Creates the account in MySQL through the API in server/ (POST /api/users).
export async function signUp({ fullName, email, password }) {
  const { res, data } = await postJson('/api/users', {
    name: fullName.trim(),
    email: email.trim().toLowerCase(),
    password,
  });
  if (res.ok) return data;

  if (res.status === 409) throw new Error('An account with this email already exists.');
  if (res.status === 503) throw new Error('The database is unavailable. Please try again later.');
  throw new Error(data.error || 'Registration failed. Please try again.');
}
