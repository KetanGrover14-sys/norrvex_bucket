import { requestSession, sealSession, sessionCookie } from './session.js';

export function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function fail(message, status) { return Object.assign(new Error(message), { status }); }

function assertOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  let url;
  try { url = new URL(origin); } catch { throw fail('Invalid request origin.', 403); }
  if (url.host !== (request.headers.get('host') || new URL(request.url).host)) throw fail('Cross-origin request rejected.', 403);
}

async function readBody(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw fail('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); throw fail('Request is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

async function upstream(route, { method = 'GET', token, body, contentType } = {}) {
  const base = new URL(process.env.WECAPURRED_URL || 'https://norrvex-partners.procurre.in');
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw fail('WECAPURRED_URL must be the origin of your wecapurred_rr website.', 503);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (contentType) headers['Content-Type'] = contentType;
  const response = await fetch(new URL(route, base), { method, headers, body, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  return { response, data };
}

export function endpoint(handler) {
  return async (request, context) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) assertOrigin(request);
      return await handler(request, context);
    } catch (error) {
      return json({ error: error.status ? error.message : 'Cannot connect to wecapurred_rr. Check the backend address and server configuration.' }, error.status || 502);
    }
  };
}

export const login = endpoint(async request => {
  let input;
  const body = await readBody(request, 8192);
  try { input = JSON.parse(body.toString()); } catch { return json({ error: 'Enter a valid email and password.' }, 400); }
  if (!input || typeof input.email !== 'string' || typeof input.password !== 'string' || !input.email.trim() || !input.password) return json({ error: 'Email and password are required.' }, 400);
  const { response, data } = await upstream('/api/auth/login', { method: 'POST', contentType: 'application/json', body: JSON.stringify({ email: input.email.trim().toLowerCase(), password: input.password }) });
  if (!response.ok) return json({ error: data.error || 'Unable to sign in.' }, response.status);
  if (typeof data.token !== 'string' || !data.user?.id) throw fail('Unexpected login response from wecapurred_rr.', 502);
  const value = sealSession(data);
  return json({ user: data.user }, 200, { 'Set-Cookie': sessionCookie(value) });
});

export const logout = endpoint(async () => json({ success: true }, 200, { 'Set-Cookie': sessionCookie('', true) }));
export const session = endpoint(async request => {
  const value = requestSession(request);
  return value ? json({ user: value.user }) : json({ error: 'Sign in with your wecapurred_rr account.' }, 401);
});

export const repository = endpoint(async request => {
  const value = requestSession(request);
  if (!value) return json({ error: 'Sign in with your wecapurred_rr account.' }, 401);
  const body = request.method === 'GET' ? undefined : await readBody(request, 8192);
  const { response, data } = await upstream('/api/repository', { method: request.method, token: value.token, body, contentType: request.headers.get('content-type') });
  return json(data, response.status, response.status === 401 ? { 'Set-Cookie': sessionCookie('', true) } : {});
});

export const upload = endpoint(async (request, context) => {
  const value = requestSession(request);
  if (!value) return json({ error: 'Sign in with your wecapurred_rr account.' }, 401);
  if (value.user.role !== 'admin') return json({ error: 'Only admins can upload installation files.' }, 403);
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return json({ error: 'Invalid project.' }, 400);
  const body = await readBody(request, 20 * 1024 * 1024);
  const { response, data } = await upstream(`/api/projects/${id}/files`, { method: 'POST', token: value.token, body, contentType: request.headers.get('content-type') });
  return json(data, response.status, response.status === 401 ? { 'Set-Cookie': sessionCookie('', true) } : {});
});
