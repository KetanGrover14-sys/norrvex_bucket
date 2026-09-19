import { requireUser } from '@/lib/auth';
import RepositoryWorkspace from '@/components/RepositoryWorkspace';

export default async function RepositoryPage() {
  return <RepositoryWorkspace user={await requireUser()} view="repository" />;
}
