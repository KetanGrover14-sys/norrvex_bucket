import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createServer } from './route-server.js';
import { groupRepository, safeURL } from '../lib/repository.js';
const upstreamRoot=path.join(__dirname,'../../wecapurred_rr');
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
const close=server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});

test('shared login, actual backend ownership filtering, mapping authorization, and session separation',async t=>{
  const tables={projects:[{id:'pv',name:'Vivek project',vendor_id:'vivek'},{id:'po',name:'Other project',vendor_id:'other'}],photos:[{id:'rv',project_id:'pv',image_url:'https://example.com/recce.jpg',material:'Brass'},{id:'rv2',project_id:'pv',image_url:'https://example.com/recce.jpg',material:'Acrylic'},{id:'ro',project_id:'po',image_url:'https://example.com/other.jpg'}],project_files:[{id:'iv',project_id:'pv',type:'installation',file_name:'installed.jpg',file_url:'https://example.com/installed.jpg'},{id:'io',project_id:'po',type:'installation',file_name:'other.jpg'}],installation_mappings:[]};
  // Execute the real Sheets repository code against in-memory sheet rows.
  const sheets=fs.readFileSync(path.join(upstreamRoot,'lib/sheets.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  const context=vm.createContext({process:{env:{}},tables});
  vm.runInContext(fs.readFileSync(path.join(upstreamRoot,'lib/lifecycle.js'),'utf8').replace(/export /g,''),context);
  vm.runInContext(sheets+`;readAll=async tab=>tables[tab].map((r,i)=>({...r,_row:i+2}));appendRow=async(tab,row)=>tables[tab].push(row);deleteRow=async(tab,index)=>tables[tab].splice(index-2,1);this.api={getRepositoryData,getProjectById,getPhotoRowById,getProjectFileById,saveInstallationMapping,removeInstallationMapping};`,context);
  // Execute the actual mutation route, retaining its project/photo/file checks.
  const routeSource=fs.readFileSync(path.join(upstreamRoot,'app/api/repository/route.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
  const routes=vm.createContext({...context.api,removalExpired:context.removalExpired,Response,console,uuid:()=> 'mapping-'+tables.installation_mappings.length,withAuth:fn=>fn});
  vm.runInContext(routeSource+';this.handlers={GET,POST,DELETE};',routes);
  const users={vivek:{id:'vivek',email:'vivek@example.test',name:'Vivek',role:'vendor'},other:{id:'other',email:'other@example.test',name:'Other',role:'vendor'},admin:{id:'admin',email:'admin@example.test',name:'Admin',role:'admin'}};
  const backend=http.createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    if(req.url==='/api/auth/login'){const body=JSON.parse(raw);const u=Object.values(users).find(u=>u.email===body.email);return u&&body.password==='test-password'?send(200,{token:'test-'+u.id,user:u}):send(401,{error:'Invalid email or password'});}
    const id=req.headers.authorization?.replace('Bearer test-','');const user=users[id];if(!user)return send(401,{error:'Expired session'});
    if(req.url==='/api/repository'){const request=new Request('http://backend/api/repository',{method:req.method,...(req.method==='GET'?{}:{body:raw,headers:{'Content-Type':'application/json'}})});request.user=user;const result=await routes.handlers[req.method](request);return send(result.status,await result.json());}
    if(req.url==='/api/projects/pv/files'){assert.match(req.headers['content-type'],/^multipart\/form-data; boundary=/);assert.match(raw.toString(),/name="type"/);return send(201,{id:'new-file',project_id:'pv',type:'installation'});}
    send(404,{error:'Not found'});
  });
  const backendURL=await listen(backend);const bucket=createServer({upstream:backendURL});const base=await listen(bucket);
  t.after(async()=>{await close(bucket);await close(backend);});
  const request=(url,cookie,method='GET',body)=>fetch(base+url,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  assert.equal((await request('/api/repository')).status,401);
  assert.equal((await request('/api/auth/login',null,'POST',{email:'vivek@example.test',password:'wrong'})).status,401);
  async function login(name){const res=await request('/api/auth/login',null,'POST',{email:`${name}@example.test`,password:'test-password'});assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);const result=await res.json();assert.equal(result.token,undefined);return res.headers.get('set-cookie').split(';')[0];}
  const vivek=await login('vivek');const other=await login('other');const admin=await login('admin');
  const recce=await (await request('/api/repository',vivek)).json();assert.deepEqual(recce.projects.map(p=>p.id),['pv']);assert.deepEqual(recce.photos.map(p=>p.id),['rv','rv2']);assert.deepEqual(recce.files.map(f=>f.id),['iv']);
  assert.deepEqual((await (await request('/api/repository',other)).json()).photos.map(p=>p.id),['ro']);
  assert.equal((await (await request('/api/repository',admin)).json()).projects.length,2);
  assert.equal((await request('/api/repository',vivek,'POST',{project_id:'po',photo_id:'ro',file_id:'io'})).status,403);
  assert.equal((await request('/api/repository',vivek,'POST',{project_id:'pv',photo_id:'rv',file_id:'io'})).status,400);
  assert.equal((await request('/api/repository',vivek,'POST',{project_id:'pv',photo_id:'rv',file_id:'iv'})).status,201);
  assert.equal((await request('/api/repository',vivek,'POST',{project_id:'pv',photo_id:'rv',file_id:'iv'})).status,201);
  assert.equal(tables.installation_mappings.length,1,'Mapping is stored once in shared backend');
  const mapped=await (await request('/api/repository',vivek)).json();const groups=groupRepository(mapped);assert.equal(groups.length,1);assert.equal(groups[0].entries.length,2);assert.equal(groups[0].installations[0].file.id,'iv');
  assert.equal((await (await request('/api/repository',other)).json()).mappings.length,0);
  assert.equal((await request('/api/projects/pv/files',vivek,'POST',{})).status,403);
  const form=new FormData();form.append('type','installation');form.append('file',new Blob(['test-image'],{type:'image/png'}),'test.png');assert.equal((await fetch(base+'/api/projects/pv/files',{method:'POST',headers:{Cookie:admin},body:form})).status,201);
  assert.equal((await fetch(base+'/api/repository',{method:'POST',headers:{Cookie:vivek,Origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await request('/api/repository',vivek,'DELETE',{project_id:'pv',photo_id:'rv',file_id:'iv'})).status,200);assert.equal(tables.installation_mappings.length,0);
  const loggedOut=await request('/api/auth/logout',vivek,'POST');assert.equal(loggedOut.status,200);assert.match(loggedOut.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await request('/api/repository')).status,401);assert.equal((await request('/api/repository',other)).status,200);
  delete users.other;const expired=await request('/api/repository',other);assert.equal(expired.status,401);assert.match(expired.headers.get('set-cookie'),/Max-Age=0/);
});

test('grouping ignores orphan mappings and invalid image links',()=>{
  assert.equal(safeURL('javascript:alert(1)'), '');assert.equal(safeURL('data:text/html,unsafe'),'');
  const groups=groupRepository({projects:[{id:'p'}],photos:[{id:'r',project_id:'p',image_url:'https://example.com/r.jpg'}],files:[{id:'f',project_id:'another',type:'installation'}],mappings:[{id:'m',project_id:'p',photo_id:'r',file_id:'f'}]});assert.equal(groups[0].installations.length,0);
});

test('unavailable upstream produces a clear connection error',async t=>{
  const unused=http.createServer();const unavailable=await listen(unused);await close(unused);const bucket=createServer({upstream:unavailable});const base=await listen(bucket);t.after(()=>close(bucket));
  const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'vivek@example.test',password:'test'})});assert.equal(response.status,502);assert.match((await response.json()).error,/WECAPURRED_URL/);
});
