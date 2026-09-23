'use client';

import { useRef, useState } from 'react';
import Modal from './Modal';
import { dimensions } from './RecceDetail';
import { removalExpired } from '@/lib/dates';

export default function InstallationMapping({ asset, data, user, onClose, onSave, onUpload }) {
  const [photoId, setPhotoId] = useState(asset.entries[0].id);
  const [fileId, setFileId] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [removalDate, setRemovalDate] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const input = useRef(null);
  const files = data.files.filter(file => file.project_id === asset.project.id && file.type === 'installation' && !removalExpired(file) && !data.mappings.some(mapping => mapping.project_id === asset.project.id && mapping.photo_id === photoId && mapping.file_id === file.id));

  async function save(event) {
    event.preventDefault(); setBusy('save'); setError('');
    try { await onSave({ project_id: asset.project.id, photo_id: photoId, file_id: fileId }); } catch (error) { setError(error.message); } finally { setBusy(''); }
  }

  async function upload() {
    const file = input.current.files[0];
    if (!file) { setError('Choose an installation image first.'); return; }
    if (!removalDate || !/^\d{4}-\d{2}-\d{2}$/.test(removalDate)) { setError('Choose the planned removal date before uploading.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 15 * 1024 * 1024) { setError('Choose a JPEG, PNG, WebP, or GIF image smaller than 15 MB.'); return; }
    if ((!/^[1-9]\d*$/.test(expiryDays) || Number(expiryDays) > 36500)) { setError('Enter project expiry as a whole number from 1 to 36500 days.'); return; }
    setBusy('upload'); setError('');
    try { const record = await onUpload(asset.project.id, file, removalDate, expiryDays); setFileId(record.id); input.current.value = ''; setRemovalDate(''); setExpiryDays(''); } catch (error) { setError(error.message); } finally { setBusy(''); }
  }

  return <Modal title="Map an installation" eyebrow="CONNECT THE FINISHED WORK" onClose={() => { if (!busy) onClose(); }}>
    <p>{asset.project.name} / {asset.title}</p>
    <form onSubmit={save}>
      <div className="form-grid">
        <label className="full">Recce specification entry<select required disabled={!!busy} value={photoId} onChange={event => { setPhotoId(event.target.value); setFileId(''); }}>
          {asset.entries.map((photo, index) => <option key={photo.id} value={photo.id}>Entry {index + 1} · {photo.material || 'No material'} · {dimensions(photo)}</option>)}
        </select></label>
        <label className="full">Installation file from this project<select required disabled={!!busy} value={fileId} onChange={event => setFileId(event.target.value)}>
          <option value="">{files.length ? 'Choose an installation file' : 'No unlinked installation files in this project'}</option>
          {files.map(file => <option key={file.id} value={file.id}>{file.file_name} · {file.status || 'pending'}</option>)}
        </select></label>
      </div>
      <p>Files and mappings are saved in the shared Norrvex Partners repository.</p>
      {user.role === 'admin' && <div><label className="upload"><strong>Or upload a new installation image</strong><span>JPEG, PNG, WebP or GIF · maximum 15 MB</span><input ref={input} disabled={!!busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" /></label>
        <div className="form-grid"><label className="block text-xs font-semibold mb-3">Project expiry in days<input type="number" min="1" max="36500" step="1" value={expiryDays} disabled={!!busy} onChange={event => setExpiryDays(event.target.value)} placeholder="e.g. 30" className="mt-1 block w-full border rounded-xl p-2 text-sm" /><span className="block mt-1 font-normal">Planned duration. Removal date controls automatic unlinking.</span></label><label className="full">Removal date (planned)<input type="date" value={removalDate} disabled={!!busy} onChange={event => setRemovalDate(event.target.value)} /></label></div>
        <p>Installation date and time are recorded automatically when uploaded.</p>
        <button type="button" className="secondary" disabled={!!busy} onClick={upload}>{busy === 'upload' ? 'Uploading…' : 'Upload to this project'}</button>
        <p>Upload first, then save the mapping to link it to the recce entry.</p>
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="secondary" disabled={!!busy} onClick={onClose}>Cancel</button><button className="primary" disabled={!!busy || !fileId}>{busy === 'save' ? 'Saving…' : 'Save mapping ↗'}</button></div>
    </form>
  </Modal>;
}
