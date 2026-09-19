import { redirect } from 'next/navigation';
import { currentSession } from '@/lib/auth';

export default async function HomePage() {
  redirect((await currentSession()) ? '/repository' : '/login');
}
