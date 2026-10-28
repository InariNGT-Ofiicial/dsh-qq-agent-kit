import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

const names=['agent.md','PERSONA.md','AGENTS.md'];
const start='<!-- qq-control:persona:start -->',end='<!-- qq-control:persona:end -->';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw new Error(code);};
async function safeDirectory(root){
 if(typeof root!=='string'||!path.isAbsolute(root))fail('WORKSPACE_NOT_CONFIGURED');
 const absolute=path.resolve(root),parsed=path.parse(absolute);
 let current=parsed.root;
 for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){
  current=path.join(current,part);const stat=await fs.lstat(current);
  if(stat.isSymbolicLink()||!stat.isDirectory())fail('UNSAFE_DIRECTORY');
 }
 return absolute;
}
async function readFile(root,name){
 const file=path.join(root,name);
 try{const st=await fs.lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1)fail('UNSAFE_FILE');if(st.size>131072)fail('FILE_TOO_LARGE');return await fs.readFile(file,'utf8');}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
}
function text(value){if(typeof value!=='string'||Buffer.byteLength(value)>16384||value.includes('\0')||value.includes(start)||value.includes(end))fail('INVALID_CONTENT');return value;}
function merge(original,agent,persona){
 const block=`${start}\n## Agent instructions\n\n${agent}\n\n## Persona\n\n${persona}\n${end}`;
 const old=original??'',a=old.indexOf(start),b=old.indexOf(end);
 if(a===-1&&b===-1)return old+(old&&!old.endsWith('\n')?'\n':'')+'\n'+block+'\n';
 if(a<0||b<a||old.indexOf(start,a+1)!==-1||old.indexOf(end,b+1)!==-1)fail('INVALID_MANAGED_MARKERS');
 return old.slice(0,a)+block+old.slice(b+end.length);
}
export class PersonaStore{
 constructor(workspaces=[]){this.workspaces=workspaces;this.queue=Promise.resolve();}
 list(){return this.workspaces.map((w,index)=>({id:String(index),label:w.label||path.basename(w.path),path:w.path}));}
 async root(id){if(typeof id!=='string'||!/^\d+$/.test(id)||!this.workspaces[Number(id)])fail('UNKNOWN_WORKSPACE');return safeDirectory(this.workspaces[Number(id)].path);}
 async read(id){const root=await this.root(id),files={};for(const name of names)files[name]=await readFile(root,name);return {files,revision:hash(files)};}
 async preview(id,agent,persona){text(agent);text(persona);const current=await this.read(id);const files={'agent.md':agent,'PERSONA.md':persona,'AGENTS.md':merge(current.files['AGENTS.md'],agent,persona)};return {files,revision:current.revision,digest:hash(files),changed:names.filter(n=>files[n]!==current.files[n])};}
 save(id,agent,persona,revision,digest){
  const job=this.queue.then(()=>this.write(id,agent,persona,revision,digest));this.queue=job.catch(()=>{});return job;
 }
 async write(id,agent,persona,revision,digest){
  const preview=await this.preview(id,agent,persona);if(preview.revision!==revision||preview.digest!==digest)fail('PREVIEW_STALE');
  if(!preview.changed.length)return {changed:[],backup:null};
  const root=await this.root(id),before=await this.read(id);
  const backupRoot=path.join(root,'.qq-control-persona');
  await fs.mkdir(backupRoot,{recursive:true});await safeDirectory(backupRoot);
  const backup=path.join(backupRoot,randomUUID());await fs.mkdir(backup);
  await fs.writeFile(path.join(backup,'snapshot.json'),JSON.stringify(before.files,null,2),{flag:'wx',mode:0o600});
  const staged=[];
  try{
   for(const name of preview.changed){const temp=path.join(root,`.qq-persona-${randomUUID()}.tmp`);await fs.writeFile(temp,preview.files[name],{flag:'wx',mode:0o600});staged.push([name,temp]);}
   if((await this.read(id)).revision!==revision)fail('PREVIEW_STALE');
   for(const [name,temp]of staged)await fs.rename(temp,path.join(root,name));
  }catch(e){
   // Preserve the complete pre-write snapshot even if a platform rename fails.
   e.message+='; backup='+backup;throw e;
  }finally{for(const [,temp]of staged)await fs.rm(temp,{force:true});}
  return {changed:preview.changed,backup};
 }
}
