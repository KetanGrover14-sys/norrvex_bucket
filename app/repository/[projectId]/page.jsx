import { requireUser } from '@/lib/auth';
import RepositoryWorkspace from '@/components/RepositoryWorkspace';

export default async function ProjectRepositoryPage({ params }) {
  const user = await requireUser();
  const { projectId } = await params;
  return <RepositoryWorkspace key={projectId} user={user} view="repository" activeProjectId={projectId} />;
}
