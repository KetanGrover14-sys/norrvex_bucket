import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

export const metadata = { title: 'Sign in' };

export default async function LoginPage() {
  if (await currentSession()) redirect('/repository');
  return <LoginForm />;
}
