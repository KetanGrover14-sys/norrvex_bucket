'use client';

import { useState } from 'react';
import Modal from './Modal';
import AssetImage from './AssetImage';
import { isImage, safeURL } from '@/lib/repository';

export function dimensions(photo) {
  return [['L', photo.length], ['B', photo.breadth], ['H', photo.height]].filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`).join(' · ') || 'Not specified';
}

export default function RecceDetail({ asset, onClose, onMap, onUnlink }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  async function unlink(mapping) {
    if (!window.confirm('Remove this shared mapping? The original recce and installation file will remain.')) return;
    setPending(mapping.id); setError('');
    try { await onUnlink(mapping); } catch (error) { setError(error.message); } finally { setPending(null); }
  }
  return <Modal wide title={asset.title} eyebrow={`${asset.project.name} / RECCE DETAILS`} onClose={onClose}>
    <div className="detail-grid"><div>
      <AssetImage src={asset.image} alt={asset.title} className="detail-image" />
      <p>{asset.location} · {asset.project.client_name}</p>
      {safeURL(asset.image) && <a className="file-link" href={safeURL(asset.image)} target="_blank" rel="noopener noreferrer">Open original recce image ↗</a>}
    </div><div><h2>Recce specifications</h2>
      {asset.entries.map((photo, index) => <section className="spec-entry" key={photo.id}><h3>Entry {index + 1}</h3>
        <dl className="details-list">{[['Material', photo.material], ['Dimensions', dimensions(photo)], ['Store', photo.store_name], ['Store owner', photo.store_owner_name], ['Contact', photo.store_owner_mobile]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not specified'}</dd></div>)}</dl>
        <p className="notes">{photo.notes}</p>
      </section>)}
    </div></div>
    <div className="installation-heading"><h2>Mapped installations <span>{asset.installations.length}</span></h2><button className="primary" onClick={onMap}>＋ Link installation</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {asset.installations.length ? asset.installations.map(mapping => <div className="installation-row" key={mapping.id}>
      {isImage(mapping.file) ? <AssetImage src={mapping.file.file_url} alt={mapping.file.file_name} /> : <span className="file-icon" aria-hidden="true">▤</span>}
      <div><strong>{mapping.file.file_name}</strong><p>Recce entry {asset.entries.findIndex(photo => photo.id === mapping.photo_id) + 1} · {mapping.file.status || 'Pending review'}</p>
        <p>Uploaded by {mapping.file.uploaded_by_name || '—'} · {mapping.file.created_at?.slice(0, 10)}</p>
        {safeURL(mapping.file.file_url) && <a href={safeURL(mapping.file.file_url)} target="_blank" rel="noopener noreferrer">View installation {isImage(mapping.file) ? 'image' : 'file'} ↗</a>}
      </div>
      <button className="remove" disabled={pending !== null} onClick={() => unlink(mapping)}>{pending === mapping.id ? 'Unlinking…' : 'Unlink'}</button>
    </div>) : <div className="empty"><h3>No installation linked yet.</h3><p>Link an installation file from this project to the matching recce entry.</p></div>}
  </Modal>;
}
