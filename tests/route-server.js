// HTTP adapter for exercising the same Web Request handlers exported by Next.js.
import http from 'node:http';
import { login, logout, session, repository, upload } from '../lib/backend.js';

export function createServer({ upstream }) {
  process.env.WECAPURRED_URL = upstream;
  process.env.SESSION_SECRET = 'test-only-secret-with-more-than-thirty-two-characters';
  process.env.COOKIE_SECURE = 'false';
  return http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method, headers: req.headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }),
    });
    const handlers = { '/api/auth/login': login, '/api/auth/logout': logout, '/api/auth/session': session, '/api/repository': repository };
    const match = req.url.match(/^\/api\/projects\/([^/]+)\/files$/);
    const handler = handlers[req.url] || (match && upload);
    const response = handler ? await handler(request, { params: Promise.resolve({ id: match?.[1] }) }) : new Response('Not found', { status: 404 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
}
