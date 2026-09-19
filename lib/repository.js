
export function groupRepository(data) {
    const projects=new Map(data.projects.map(p=>[p.id,p]));
    const files=new Map(data.files.filter(f=>f.type==='installation').map(f=>[f.id,f]));
    const groups=new Map();
    for(const photo of data.photos) {
      const project=projects.get(photo.project_id);if(!project)continue;
      const key=JSON.stringify([photo.project_id,photo.image_url||photo.id]);
      if(!groups.has(key))groups.set(key,{id:photo.id,project,image:photo.image_url,entries:[],installations:[],title:photo.store_name||photo.location||project.name,location:photo.location||'',createdAt:photo.created_at});
      const group=groups.get(key);group.entries.push(photo);
      for(const mapping of data.mappings.filter(m=>m.project_id===photo.project_id&&m.photo_id===photo.id)){
        const file=files.get(mapping.file_id);if(file&&file.project_id===photo.project_id)group.installations.push({...mapping,file});
      }
    }
    return [...groups.values()].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));
  }
export function safeURL(value) {try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}}
export function isImage(file){return /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.file_name||'')||/\.(jpe?g|png|webp|gif|avif|bmp)(?:\?|$)/i.test(file.file_url||'');}
