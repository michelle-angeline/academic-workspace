// Small fetch wrapper for the API in server/. The "proxy" setting in package.json
// forwards /api and /uploads requests to http://localhost:5000 during development.

export async function request(url, { method = 'GET', json, formData } = {}) {
  const options = { method };
  if (json !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(json);
  } else if (formData) {
    options.body = formData;
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('Could not reach the server. Make sure the API is running.');
  }
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// Turns a failed response into an Error with a readable message
export function apiError(res, data, fallback) {
  if (res.status === 503) return new Error('The database is unavailable. Please try again later.');
  return new Error(data.error || fallback);
}
