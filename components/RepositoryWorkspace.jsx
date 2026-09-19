'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Brand from './Brand';
import AssetImage from './AssetImage';
import RecceDetail from './RecceDetail';
import InstallationMapping from './InstallationMapping';
import { groupRepository } from '@/lib/repository';
import { api, jsonOptions } from '@/lib/client-api';

const empty = { projects: [], photos: [], files: [], mappings: [] };

export default function RepositoryWorkspace({ user, view }) {
  const router = useRouter();
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [projectId, setProjectId] = useState('all');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [mapping, setMapping] = useState(false);
  const [notice, setNotice] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const generation = useRef(0);
  const isInstallations = view === 'installations';
  const assets = useMemo(() => groupRepository(data), [data]);
  const selected = assets.find(asset => asset.id === selectedId);

  const handleError = useCallback(error => {
    if (error.status === 401) {
      generation.current += 1;
      setData(empty); setSelectedId(null);
      router.replace('/login'); router.refresh();
    }
    return error.message;
  }, [router]);

  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await api('/api/repository');
      if (generation.current !== version) return;
      if (!['projects', 'photos', 'files', 'mappings'].every(key => Array.isArray(result[key]))) throw new Error('The repository response is incomplete. Update the wecapurred_rr backend.');
      setData(result);
      setProjectId(previous => result.projects.some(project => project.id === previous) ? previous : 'all');
      setSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      if (generation.current === version) setError(handleError(error));
    } finally { if (generation.current === version) setLoading(false); }
  }, [handleError]);

  useEffect(() => { refresh(); return () => { generation.current += 1; }; }, [refresh]);
  useEffect(() => { if (!notice) return; const timeout = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timeout); }, [notice]);

  async function signOut() {
    setSigningOut(true);
    try {
      await api('/api/auth/logout', { method: 'POST' });
      generation.current += 1; setData(empty); setSelectedId(null);
      router.replace('/login'); router.refresh();
    } catch (error) { setError(handleError(error)); setSigningOut(false); }
  }

  async function saveMapping(values) {
    try {
      const result = await api('/api/repository', jsonOptions('POST', values));
      setData(previous => ({ ...previous, mappings: [...previous.mappings.filter(item => !(item.project_id === result.project_id && item.photo_id === result.photo_id && item.file_id === result.file_id)), result] }));
      setMapping(false); setNotice('Installation linked in the shared repository');
    } catch (error) { handleError(error); throw error; }
  }

  async function unlink(values) {
    try {
      await api('/api/repository', jsonOptions('DELETE', { project_id: values.project_id, photo_id: values.photo_id, file_id: values.file_id }));
      setData(previous => ({ ...previous, mappings: previous.mappings.filter(item => !(item.project_id === values.project_id && item.photo_id === values.photo_id && item.file_id === values.file_id)) }));
      setNotice('Shared installation mapping removed');
    } catch (error) { handleError(error); throw error; }
  }

  async function upload(projectId, file) {
    try {
      const body = new FormData(); body.append('type', 'installation'); body.append('file', file);
      const record = await api(`/api/projects/${encodeURIComponent(projectId)}/files`, { method: 'POST', body });
      setData(previous => ({ ...previous, files: [...previous.files, record] }));
      setNotice('Installation uploaded. Save the mapping to link it.');
      return record;
    } catch (error) { handleError(error); throw error; }
  }

  const search = query.trim().toLowerCase();
  const visible = assets.filter(asset => (!isInstallations || asset.installations.length) &&
    (projectId === 'all' || asset.project.id === projectId) &&
    (status === 'all' || (asset.installations.length ? 'mapped' : 'unmapped') === status) &&
    [asset.title, asset.location, asset.project.name, asset.project.client_name, ...asset.entries.flatMap(photo => [photo.material, photo.notes, photo.store_name])].join(' ').toLowerCase().includes(search));
  const title = isInstallations ? 'Installation mapping' : 'Recce repository';
  const stats = [[assets.length, 'Recce images', 'From your projects', '▧'], [assets.filter(asset => asset.installations.length).length, 'Installation linked', 'Connected to recce', '↗'], [data.projects.length, 'Projects', 'Shared with wecapurred_rr', '⌘']];

  return <>
    <aside className="sidebar"><Brand /><div className="workspace"><span className="workspace-icon">{(user.name || 'N')[0]}</span><div>{user.name || user.email}<small>{user.role === 'admin' ? 'Admin · All projects' : 'Your wecapurred_rr projects'}</small></div></div>
      <p className="nav-label">WORKSPACE</p><nav aria-label="Workspace navigation">
        <Link className={`nav ${!isInstallations ? 'active' : ''}`} href="/repository" aria-current={!isInstallations ? 'page' : undefined}><span aria-hidden="true">▦</span>Recce repository <b>{assets.length}</b></Link>
        <Link className={`nav ${isInstallations ? 'active' : ''}`} href="/installations" aria-current={isInstallations ? 'page' : undefined}><span aria-hidden="true">⌘</span>Installation mapping</Link>
      </nav><div className="sidebar-bottom"><span className="status-dot" />Shared repository<small>Source: wecapurred_rr</small><button className="export" onClick={signOut} disabled={signingOut}>Sign out ↗</button></div>
    </aside>
    <div className="main"><header><span>Workspace <span className="slash">/</span> <b>{title}</b></span><div className="header-account"><span className="account-email">{user.email}</span><button className="secondary mobile-logout" onClick={signOut} disabled={signingOut}>Sign out</button><span className="avatar">{(user.name || user.email).slice(0, 2).toUpperCase()}</span></div></header>
      <main><div className="heading"><div><div className="eyebrow">YOUR WORK, ALL IN ONE PLACE</div><h1>{title}<span>.</span></h1><p>Your recce images from wecapurred_rr, connected to the finished installation.</p></div><button className="primary" disabled={loading} onClick={refresh}>{loading ? 'Syncing…' : '↻ Refresh recce'}</button></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="stats">{stats.map(([number, label, detail, icon]) => <div className="stat" key={label}><div><p>{label}</p><strong>{String(number).padStart(2, '0')}</strong><small>{detail}</small></div><span className="stat-icon" aria-hidden="true">{icon}</span></div>)}</div>
        <section className="collection"><div className="collection-heading"><div><h2>{isInstallations ? 'Recce with linked installations' : 'All recce images'} <span>{visible.length}</span></h2><p>Original images and specifications, shared directly from your projects.</p></div><span className="view-label">▦ &nbsp; Gallery view</span></div>
          <div className="toolbar"><label className="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search projects, stores, materials, or locations…" aria-label="Search recce repository" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <select aria-label="Filter project" value={projectId} onChange={event => setProjectId(event.target.value)}><option value="all">All projects</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
            <select aria-label="Filter mapping" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All mappings</option><option value="unmapped">Not mapped</option><option value="mapped">Installation linked</option></select>
          </div>
          <div className="gallery" aria-busy={loading}>
            {visible.map(asset => <button className="card" key={asset.id} onClick={() => { setSelectedId(asset.id); setMapping(false); }} aria-label={`View ${asset.title}`}>
              <div className="card-image"><AssetImage src={asset.image} alt={asset.title} /><span className={`badge ${asset.installations.length ? 'installed' : ''}`}>{asset.installations.length ? '● Installation linked' : '○ Not mapped'}</span></div>
              <div className="card-body"><span className="card-type">{asset.project.name}</span><h3>{asset.title}</h3><div className="spec-line"><span>Material</span><span>{[...new Set(asset.entries.map(photo => photo.material).filter(Boolean))].join(', ') || 'Not specified'}</span></div><div className="spec-line"><span>Specifications</span><span>{asset.entries.length} {asset.entries.length === 1 ? 'entry' : 'entries'}</span></div><div className="card-footer"><span>⌖ {asset.location || asset.project.client_name || 'Location not specified'}</span><span>View details ↗</span></div></div>
            </button>)}
            {!visible.length && <div className="empty"><h3>{loading ? 'Loading your recce…' : error ? 'Unable to load your recce' : isInstallations ? 'No matching installation mappings' : 'No matching recce images'}</h3><p>{loading ? 'Fetching your shared project records.' : error ? 'Check the connection and use Refresh recce to retry.' : isInstallations ? 'Open a recce image and link an installation file from the same project.' : 'Recce captured in wecapurred_rr under your account will appear here. Refresh after adding recce, or adjust your filters.'}</p></div>}
          </div>
        </section><footer><span>norrvex_bucket <span className="footer-dot">•</span> Recce to reality.</span><span>{loading ? 'Syncing…' : error ? 'Sync failed' : `Synced ${syncedAt}`} · Source: wecapurred_rr</span></footer>
      </main>
    </div>
    {selected && <RecceDetail asset={selected} onClose={() => setSelectedId(null)} onMap={() => setMapping(true)} onUnlink={unlink} />}
    {selected && mapping && <InstallationMapping asset={selected} data={data} user={user} onClose={() => setMapping(false)} onSave={saveMapping} onUpload={upload} />}
    {notice && <div className="toast" role="status">{notice}</div>}
  </>;
}
