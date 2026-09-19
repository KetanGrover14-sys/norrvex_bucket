import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { openSession, SESSION_COOKIE } from './session';

export async function currentSession() {
  return openSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const session = await currentSession();
  if (!session) redirect('/login');
  return session.user;
}
