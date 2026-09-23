import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { formatTimestamp, formatRemovalDate } from '../lib/dates.js';
import { groupRepository } from '../lib/repository.js';

test('dates display in IST and removal dates do not shift across timezones', () => {
  assert.match(formatTimestamp('2026-09-23T20:00:00Z'), /24 Sept? 2026.*01:30 am IST/i);
  assert.equal(formatTimestamp(''), 'Not recorded');
  assert.equal(formatTimestamp('invalid'), 'Not recorded');
  assert.match(formatRemovalDate('2026-10-01'), /01 Oct 2026/);
  assert.equal(formatRemovalDate('2026-02-30'), 'Not specified');
  assert.equal(formatRemovalDate(undefined), 'Not specified');
});

test('installation upload saves timestamp and removal date, validates dates, and keeps mapping visible in Bucket', async () => {
  const saved = []; const mappings = [];
  const source = fs.readFileSync(new URL('../../wecapurred_rr/app/api/projects/[id]/files/route.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const context = vm.createContext({
    Response, Buffer, console,
    getProjectById: async () => ({ id: 'project', vendor_id: 'vivek' }),
    getProjectFiles: async () => saved,
    getPhotoRowById: async id => id === 'photo' ? { id, project_id: 'project' } : null,
    insertProjectFile: async record => saved.push(record),
    uploadToS3: async () => 'https://example.test/install.png',
    saveInstallationMapping: async mapping => { mappings.push(mapping); return mapping; },
    withAuth: handler => handler, uuid: () => `id-${saved.length}-${mappings.length}`,
  });
  vm.runInContext(source + ';this.upload = POST;', context);
  async function upload(date, days) {
    const form = new FormData(); form.append('type', 'installation'); form.append('photo_id', 'photo');
    form.append('file', new Blob(['image-fixture'], { type: 'image/png' }), 'install.png');
    if (date !== undefined) form.append('removal_date', date);
    if (days !== undefined) form.append('project_expiry_days', days);
    const request = new Request('http://localhost/upload', { method: 'POST', body: form });
    request.user = { id: 'admin', role: 'admin', name: 'Admin' };
    return context.upload(request, { params: { id: 'project' } });
  }
  const result = await upload('2026-10-01', '30');
  assert.equal(result.status, 201);
  const record = await result.json();
  assert.equal(record.removal_date, '2026-10-01');
  assert.equal(record.project_expiry_days, '30');
  for (const days of ['0', '-1', '1.5', 'abc', '36501']) assert.equal((await upload('2026-10-01', days)).status, 400);
  assert.ok(Number.isFinite(Date.parse(record.created_at)));
  assert.equal(saved[0].removal_date, '2026-10-01');
  const gallery = groupRepository({ projects: [{ id: 'project' }], photos: [{ id: 'photo', project_id: 'project', image_url: 'https://example.test/recce.png' }], files: saved, mappings });
  assert.equal(gallery[0].installations[0].file.removal_date, '2026-10-01');
  for (const invalid of ['2026-02-30', '2026-13-01', 'tomorrow']) assert.equal((await upload(invalid)).status, 400);
  assert.equal(saved.length, 1, 'Invalid dates must be rejected before saving');
  assert.equal((await upload(undefined)).status, 201, 'Legacy clients remain compatible');
  assert.equal(saved[1].removal_date, '');
  const sheets = fs.readFileSync(new URL('../../wecapurred_rr/lib/sheets.js', import.meta.url), 'utf8');
  assert.match(sheets, /project_files:\s*\[[^\]]*'created_at', 'removal_date', 'project_expiry_days'\]/);
});
