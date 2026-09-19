export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store' });
  } catch { throw new Error('Cannot connect to Norrvex Bucket. Please try again.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('The server returned an invalid response.'); }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed. Please try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const jsonOptions = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
