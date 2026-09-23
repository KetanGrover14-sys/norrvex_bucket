// Run after npm run build. Exercises the actual Next.js production server.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backend = http.createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/auth/login') {
    const input = JSON.parse(Buffer.concat(chunks));
    if (input.email !== 'vivek@example.test' || input.password !== 'test-password') {
      response.writeHead(401); response.end(JSON.stringify({ error: 'Invalid email or password' })); return;
    }
    response.end(JSON.stringify({ token: 'fixture-token', user: { id: 'vivek', name: 'Vivek', email: input.email, role: 'vendor' } })); return;
  }
  if (request.headers.authorization !== 'Bearer fixture-token') {
    response.writeHead(401); response.end(JSON.stringify({ error: 'Unauthorized' })); return;
  }
  response.end(JSON.stringify({ projects: [{ id: 'p1', name: 'Vivek project', vendor_id: 'vivek' }], photos: [{ id: 'r1', project_id: 'p1', image_url: 'https://example.test/recce.jpg', material: 'Brass' }], files: [], mappings: [] }));
});
backend.listen(0, '127.0.0.1'); await once(backend, 'listening');
const reservation = http.createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
const base = `http://127.0.0.1:${port}`;
let output = '';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, WECAPURRED_URL: `http://127.0.0.1:${backend.address().port}`, SESSION_SECRET: 'production-smoke-test-secret-at-least-thirty-two-characters', COOKIE_SECURE: 'false' },
});
server.stdout.on('data', chunk => { output += chunk; });
server.stderr.on('data', chunk => { output += chunk; });
try {
  let ready = false;
  for (let index = 0; index < 100; index++) {
    try { if ((await fetch(`${base}/login`)).status === 200) { ready = true; break; } } catch {}
    if (server.exitCode !== null) break;
    await delay(200);
  }
  assert.ok(ready, `Next.js did not start: ${output}`);
  const loginPage = await (await fetch(`${base}/login`)).text();
  assert.match(loginPage, /Every store/);
  assert.match(loginPage, /Apollo Pharmacy/);
  assert.match(loginPage, /Norrvex Labs/);
  assert.match(loginPage, /name="email"/);
  assert.match(loginPage, /\/_next\/static\//);
  const protectedPage = await fetch(`${base}/repository`, { redirect: 'manual' });
  // A loading boundary may stream a 200 response before Next emits its redirect meta tag.
  if (protectedPage.status === 307) assert.equal(protectedPage.headers.get('location'), '/login');
  else {
    assert.equal(protectedPage.status, 200);
    const redirected = await protectedPage.text();
    assert.match(redirected, /id="__next-page-redirect"[^>]*content="1;url=\/login"/);
    assert.doesNotMatch(redirected, /Your wecapurred_rr projects/);
  }
  assert.equal((await fetch(`${base}/api/repository`)).status, 401);
  const authenticated = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'vivek@example.test', password: 'test-password' }) });
  assert.equal(authenticated.status, 200);
  const cookie = authenticated.headers.get('set-cookie').split(';')[0];
  assert.equal((await authenticated.json()).token, undefined);
  const headers = { Cookie: cookie };
  const recce = await (await fetch(`${base}/api/repository`, { headers })).json();
  assert.equal(recce.photos[0].material, 'Brass');
  const gallery = await (await fetch(`${base}/repository`, { headers })).text();
  assert.match(gallery, /Vivek/); assert.match(gallery, /Recce repository/);
  assert.match(gallery, /Your projects/);
  assert.match(gallery, /Search projects/);
  const projectPage = await (await fetch(`${base}/repository/p1`, { headers })).text();
  assert.match(projectPage, /Project recce images/);
  assert.match(projectPage, /All projects/);
  const installations = await (await fetch(`${base}/installations`, { headers })).text();
  assert.match(installations, /Recce with linked installations/);
  const upload = await fetch(`${base}/api/projects/p1/files`, { method: 'POST', headers }); assert.equal(upload.status, 403);
  const loggedOut = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { ...headers, Origin: base } });
  assert.match(loggedOut.headers.get('set-cookie'), /Max-Age=0/);
  console.log('PASS: Next.js production pages, protected redirects, login cookies, shared recce API, installation page, upload permissions, and logout.');
} finally {
  server.kill();
  backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve));
}
