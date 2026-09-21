import Link from 'next/link';

export default function ProjectGrid({ projects, assets, query, loading, error }) {
  const search = query.trim().toLowerCase();
  const visible = projects.filter(project => [project.name, project.client_name, project.description].join(' ').toLowerCase().includes(search));
  return <>
    <p className="project-result-count">{visible.length} {visible.length === 1 ? 'project' : 'projects'}</p>
    <div className="gallery" aria-busy={loading}>
      {visible.map(project => {
        const photos = assets.filter(asset => asset.project.id === project.id);
        const installed = photos.filter(asset => asset.installations.length).length;
        return <Link className="card project-card" href={`/repository/${encodeURIComponent(project.id)}`} key={project.id} aria-label={`Open project ${project.name}`}>
          <div className="project-card-top"><span className="project-folder" aria-hidden="true">▤</span><span className="card-type">PROJECT</span></div>
          <div className="card-body"><h3>{project.name}</h3><p className="project-client">{project.client_name || 'Client not specified'}</p>
            {project.description && <p className="project-description">{project.description}</p>}
            <div className="spec-line"><span>Recce images</span><span>{photos.length}</span></div>
            <div className="spec-line"><span>Installation linked</span><span>{installed}</span></div>
            <div className="card-footer"><span>{photos.length ? 'View project images' : 'No recce images yet'}</span><span>Open project ↗</span></div>
          </div>
        </Link>;
      })}
      {!visible.length && <div className="empty"><h3>{loading ? 'Loading your projects…' : error ? 'Unable to load projects' : search ? 'No matching projects' : 'No projects yet'}</h3><p>{loading ? 'Fetching your projects from Norrvex Partners.' : error ? 'Use Refresh recce to retry.' : search ? 'Try another project or client name.' : 'Projects assigned to your account in Norrvex Partners will appear here.'}</p></div>}
    </div>
  </>;
}
