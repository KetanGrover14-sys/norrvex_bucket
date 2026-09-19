import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'norrvex_session';
const MAX_AGE = 7 * 24 * 60 * 60;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('replace-with-')) {
    throw new Error('Set SESSION_SECRET to a random value of at least 32 characters.');
  }
  return createHash('sha256').update(secret).digest();
}

export function sealSession({ token, user }, now = Date.now()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const session = { token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, expires: now + MAX_AGE * 1000 };
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  const value = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  if (value.length > 3800) throw new Error('The account session exceeds the cookie size limit.');
  return value;
}

export function openSession(value, now = Date.now()) {
  if (!value) return null;
  try {
    const packed = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    const json = Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
    const session = JSON.parse(json);
    return session.expires > now && typeof session.token === 'string' && session.user?.id ? session : null;
  } catch { return null; }
}

export function requestSession(request) {
  const prefix = `${SESSION_COOKIE}=`;
  const value = (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(prefix))?.slice(prefix.length);
  return openSession(value);
}

export function sessionCookie(value, clear = false) {
  const secure = process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production');
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : MAX_AGE}${secure ? '; Secure' : ''}`;
}
