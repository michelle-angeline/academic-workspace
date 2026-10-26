// Placeholder authentication. Replace the body of signIn with a real API call
// (e.g. fetch('/api/login', ...)) once the backend exists.

const DEMO_ACCOUNT = {
  email: 'demo@university.edu',
  password: 'password123',
};

export async function signIn(email, password) {
  // Simulate network latency so the loading state is visible.
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (email.trim().toLowerCase() === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password) {
    return { email: DEMO_ACCOUNT.email };
  }

  throw new Error('Incorrect email or password. Please check your credentials and try again.');
}

// Placeholder registration. Replace with a real API call (e.g. fetch('/api/register', ...)).
export async function signUp({ fullName, email, password }) {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (email.trim().toLowerCase() === DEMO_ACCOUNT.email) {
    throw new Error('An account with this email already exists.');
  }

  return { fullName: fullName.trim(), email: email.trim().toLowerCase() };
}
