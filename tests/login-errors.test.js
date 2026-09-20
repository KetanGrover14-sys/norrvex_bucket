import { test } from 'node:test';
import assert from 'node:assert/strict';
import { login } from '../lib/backend.js';

const request = () => new Request('http://localhost:3100/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.invalid', password: 'test-password' }),
});

test('login distinguishes configuration, upstream, and credential errors', async t => {
  const env = { ...process.env };
  t.after(() => { process.env.SESSION_SECRET = env.SESSION_SECRET || ''; process.env.WECAPURRED_URL = env.WECAPURRED_URL || ''; });
  let calls = 0;
  const mocked = t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ error: 'Invalid email or password' }, { status: 401 }); });
  delete process.env.SESSION_SECRET;
  let response = await login(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /SESSION_SECRET/);
  assert.equal(calls, 0, 'Do not send credentials when the local session configuration is broken');
  process.env.SESSION_SECRET = 'valid-test-secret-longer-than-thirty-two-characters';
  process.env.WECAPURRED_URL = 'not a URL';
  response = await login(request()); assert.equal(response.status, 503);
  process.env.WECAPURRED_URL = 'https://partner.example';
  response = await login(request()); assert.equal(response.status, 401);
  mocked.mock.mockImplementation(async () => new Response(null, { status: 308, headers: { Location: 'https://other.example' } }));
  response = await login(request()); assert.equal(response.status, 503);
  assert.match((await response.json()).error, /redirected/);
  mocked.mock.mockImplementation(async () => new Response('<html>Bad gateway</html>', { status: 502 }));
  response = await login(request()); assert.equal(response.status, 502);
  assert.match((await response.json()).error, /partner backend returned HTTP 502/);
});
