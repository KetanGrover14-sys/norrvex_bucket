import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = name => fs.readFileSync(new URL(`../../wecapurred_rr/${name}`, import.meta.url), 'utf8');
const strip = source => source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');

test('IST expiry preserves removal day, expires after midnight, and retains installation history', () => {
  const context = vm.createContext({}); vm.runInContext(strip(read('lib/lifecycle.js')), context);
  const photo = { id: 'r', project_id: 'p', store_id: 'AP-001', brand_name: 'Apollo Pharmacy', payment_status: 'yes' };
  const file = { id: 'f', project_id: 'p', type: 'installation', removal_date: '2026-09-23', created_at: '2026-09-20T10:00:00Z' };
  const mapping = { id: 'm', photo_id: 'r', project_id: 'p', file_id: 'f' };
  const before = new Date('2026-09-23T18:29:59Z');
  const after = new Date('2026-09-23T18:30:00Z');
  assert.equal(context.removalExpired(file, before), false);
  assert.equal(context.removalExpired(file, after), true);
  const current = context.lifecycle(photo, [file], [mapping], before);
  assert.equal(current.status, 'installed'); assert.equal(current.expiry_days, 0);
  const removed = context.lifecycle(photo, [file], [mapping], after);
  assert.equal(removed.status, 'removed'); assert.equal(removed.expiry_days, -1);
  assert.equal(removed.installations[0].file.id, 'f');
  assert.equal(context.lifecycle(photo, [], [], after).status, 'recce');
  assert.equal(context.removalExpired({ removal_date: 'invalid' }, after), false);
  const later = { ...file, id: 'later', removal_date: '2026-10-01' };
  const mixed = context.lifecycle(photo, [file, later], [mapping, { ...mapping, id: 'm2', file_id: 'later' }], after);
  assert.equal(mixed.status, 'installed'); assert.equal(mixed.expiry_days, 7);
  const rows = context.adminRows({ projects: [{ id: 'p', name: 'Test' }], photos: [photo, { id: 'orphan', project_id: 'missing' }], files: [file], mappings: [mapping] }, after);
  assert.equal(rows.length, 1); assert.equal(rows[0].payment_status, 'yes'); assert.equal(rows[0].store_id, 'AP-001');
});

test('repository hides expired links but retains files and admin history; vendor isolation remains intact', async () => {
  const tables = {
    projects: [{ id: 'p', name: 'Project', vendor_id: 'vivek' }, { id: 'other', vendor_id: 'someone-else' }],
    photos: [{ id: 'r', project_id: 'p' }, { id: 'other-photo', project_id: 'other' }],
    project_files: [{ id: 'f', project_id: 'p', type: 'installation', removal_date: '2000-01-01', file_url: 'https://example.test/retained.jpg' }],
    installation_mappings: [{ id: 'm', project_id: 'p', photo_id: 'r', file_id: 'f' }],
  };
  const context = vm.createContext({ process: { env: {} }, tables });
  vm.runInContext(strip(read('lib/lifecycle.js')) + strip(read('lib/sheets.js')) + ';readAll=async tab=>tables[tab].map((row,i)=>({...row,_row:i+2}));', context);
  const vendor = await context.getRepositoryData({ id: 'vivek', role: 'vendor' }, { includeExpired: true });
  assert.equal(vendor.mappings.length, 0);
  assert.equal(vendor.photos.length, 1); assert.equal(vendor.photos[0].lifecycle_status, 'removed');
  assert.equal(vendor.files[0].file_url, 'https://example.test/retained.jpg');
  assert.equal(tables.installation_mappings.length, 1, 'Audit history must not be deleted');
  const admin = await context.getAdminPhotoRows();
  assert.equal(admin.find(row => row.id === 'r').installations.length, 1);
  assert.equal(admin.find(row => row.id === 'r').status, 'removed');
});

test('admin entries API denies vendors and restricts updates to allowed metadata', async () => {
  let saved;
  const context = vm.createContext({ Response, console,
    verifyToken: token => token === 'admin' ? { id: 'a', role: 'admin' } : token === 'vendor' ? { id: 'v', role: 'vendor' } : null,
    tokenFromRequest: request => request.headers.get('authorization'),
    getAdminPhotoRows: async () => [{ id: 'r' }],
    updateAdminPhotoDetails: async (id, values) => { saved = { id, ...values }; return saved; },
  });
  vm.runInContext(strip(read('lib/withAuth.js')) + strip(read('app/api/admin/entries/route.js')) + ';this.handlers={GET,PATCH};', context);
  const request = (role, values) => new Request('http://localhost/api/admin/entries', {
    method: values ? 'PATCH' : 'GET', headers: { authorization: role, 'Content-Type': 'application/json' }, ...(values ? { body: JSON.stringify(values) } : {}),
  });
  assert.equal((await context.handlers.GET(request(''))).status, 401);
  assert.equal((await context.handlers.GET(request('vendor'))).status, 403);
  assert.equal((await context.handlers.PATCH(request('vendor', { id: 'r', payment_status: 'yes' }))).status, 403);
  assert.equal((await context.handlers.PATCH(request('admin', { id: 'r', project_id: 'other' }))).status, 400);
  assert.equal((await context.handlers.PATCH(request('admin', { id: 'r', payment_status: 'maybe' }))).status, 400);
  assert.equal((await context.handlers.PATCH(request('admin', { id: 'r', store_id: ' AP-001 ', payment_status: 'yes' }))).status, 200);
  assert.equal(saved.store_id, 'AP-001'); assert.equal(saved.payment_status, 'yes');
});
