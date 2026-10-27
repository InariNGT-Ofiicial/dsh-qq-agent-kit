import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {classify} from './policy.mjs';
import {onebot} from './onebot.mjs';
import {askDsh} from './dsh-turn.mjs';
import {savePairing} from './config.mjs';
const root=path.resolve(import.meta.dirname,'..');
const configFile=path.join(root,'.local/config.json');
const cfg=JSON.parse(fs.readFileSync(configFile,'utf8'));
const stateFile=path.join(root,'.local/bridge-state.json');
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{seen:[],paired:false,replies:0};
const seen=new Set(state.seen);
const save=()=>{fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state),{mode:0o600});fs.renameSync(stateFile+'.tmp',stateFile);};
const audit=(event,extra={})=>console.log(JSON.stringify({at:new Date().toISOString(),event,...extra}));
const remember=(key)=>{seen.add(key);state.seen=[...seen];save();};
const info=await onebot(cfg,'get_login_info');
if(String(info.user_id)!==String(cfg.selfId))throw new Error('Unexpected QQ account; refusing startup');
const url=new URL(cfg.onebotWs);url.searchParams.set('access_token',cfg.onebotToken);
const socket=new WebSocket(url);
let busy=false;
socket.addEventListener('open',()=>audit('onebot_connected'));
socket.addEventListener('message',async({data})=>{
 let event;try{event=JSON.parse(String(data));}catch{return;}
 const result=classify(event,cfg,seen);
 if(event.message_type==='private'&&cfg.allowedPeers.map(String).includes(String(event.user_id)))audit('private_event',{decision:result.kind});
 if(!['pair','prompt'].includes(result.kind))return;
 if(busy)return; // Explicitly no automatic replay or backlog after overload.
 busy=true;remember(result.key);
 let stage='model';
 try {
   if(result.kind==='pair'){
     Object.assign(cfg,savePairing(configFile,result.peer));delete cfg.pairingNonce;delete cfg.pairingExpiresAt;
     state.paired=true;save();audit('paired');
     stage='send';
     await onebot(cfg,'send_private_msg',{user_id:Number(result.peer),message:[{type:'text',data:{text:'私聊测试已配对。现在直接发送文字即可，也支持 /dsh 空格 开头。'}}]});
     return;
   }
   if(process.argv.includes('--pair-only')){audit('prompt_skipped_pair_only');return;}
   const reply=await askDsh(cfg,result.prompt);
   const text=reply.text.slice(0,3000);
   stage='send';
   // Marked before send: ambiguous network failures must never resend automatically.
   await onebot(cfg,'send_private_msg',{user_id:Number(result.peer),message:[{type:'text',data:{text}}]});
   state.replies++;save();audit('private_round_trip',{replyLength:text.length,messageKeyHash:createHash('sha256').update(result.key).digest('hex').slice(0,12)});
 }catch{audit('request_failed',{stage});}finally{busy=false;}
});
socket.addEventListener('error',()=>audit('onebot_error'));
socket.addEventListener('close',()=>{audit('onebot_closed');process.exitCode=1;});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>socket.close());
