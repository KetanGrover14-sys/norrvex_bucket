import { requireUser } from '@/lib/auth';
import RepositoryWorkspace from '@/components/RepositoryWorkspace';

export const metadata = { title: 'Installation mapping' };

export default async function InstallationsPage() {
  return <RepositoryWorkspace user={await requireUser()} view="installations" />;
}
