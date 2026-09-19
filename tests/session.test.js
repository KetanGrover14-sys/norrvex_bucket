import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sealSession, openSession, sessionCookie } from '../lib/session.js';

test('sessions are encrypted, authenticated, expire, and work across server instances', () => {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-thirty-two-characters';
  const source = { token: 'private-upstream-token', user: { id: 'vivek', email: 'vivek@example.test', name: 'Vivek', role: 'vendor' } };
  const cookie = sealSession(source, 1000);
  assert.equal(openSession(cookie, 1001).user.id, 'vivek');
  assert.equal(Buffer.from(cookie, 'base64url').includes(Buffer.from(source.token)), false);
  const modified = Buffer.from(cookie, 'base64url'); modified[30] ^= 1;
  assert.equal(openSession(modified.toString('base64url'), 1001), null);
  assert.equal(openSession(cookie, 1000 + 7 * 86400000), null);
  assert.equal(openSession('invalid', 1001), null);
  assert.match(sessionCookie('', true), /Max-Age=0/);
  process.env.SESSION_SECRET = 'a-different-instance-secret-at-least-thirty-two-characters';
  assert.equal(openSession(cookie, 1001), null);
});
