import fs from 'node:fs';
import path from 'node:path';
import {GroupEngine,readControl,recordGroup} from './group-control.mjs';
import {askDsh} from './dsh-turn.mjs';
const root=path.resolve(import.meta.dirname,'..');
const configFile=process.env.QQ_ACCOUNT_CONFIG??path.join(root,'.local/config.json');
const cfg=JSON.parse(fs.readFileSync(configFile));
const controlFile=path.join(root,'.local/group-control.json'),stateFile=path.join(root,'.local/group-state.json');
const audit=(event,extra={})=>console.log(JSON.stringify({at:new Date().toISOString(),event,...extra}));
async function action(name,params={}){
 const r=await fetch(cfg.onebotHttp+'/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.onebotToken},body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
 const j=await r.json();if(!r.ok||j.status!=='ok'||j.retcode!==0)throw Error('OneBot action failed');return j.data;
}
if(String((await action('get_login_info')).user_id)!==String(cfg.selfId))throw Error('Wrong QQ account');
const engine=new GroupEngine({selfId:cfg.selfId,control:()=>readControl(controlFile),
 state:fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{seen:[],replies:[],count:0},
 save:s=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(s),{mode:0o600});fs.renameSync(stateFile+'.tmp',stateFile);},
 record:(row,direction)=>recordGroup(path.join(root,'.local/group-messages'),row,direction),
 ask:async prompt=>(await askDsh(cfg,prompt)).text,
 send:async(group,text)=>{
  const latest=readControl(controlFile);if(!latest.enabled||latest.mode==='off'||!latest.allowedGroups.includes(group))throw Error('Outbound group denied');
  return action('send_group_msg',{group_id:Number(group),message:[{type:'text',data:{text}}]});
 },audit});
const url=new URL(cfg.onebotWs);url.searchParams.set('access_token',cfg.onebotToken);
const socket=new WebSocket(url);
socket.addEventListener('open',()=>audit('group_worker_connected'));
socket.addEventListener('message',async({data})=>{let event;try{event=JSON.parse(String(data));}catch{return;}
 try{const decision=await engine.receive(event);if(decision!=='ignored')audit('group_event',{decision});}catch{audit('group_request_failed');}
});
socket.addEventListener('error',()=>audit('group_socket_error'));
socket.addEventListener('close',()=>{audit('group_socket_closed');process.exitCode=1;});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>socket.close());
