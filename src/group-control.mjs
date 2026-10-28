import fs from 'node:fs';
import path from 'node:path';
export const defaults={enabled:false,recordMessages:false,mode:'mention',allowedGroups:[],cooldownSeconds:60,maxRepliesPerHour:10};
export function validateControl(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid controls');
 if(Object.keys(value).some(k=>!Object.hasOwn(defaults,k)))throw Error('Unknown control');
 const c={...defaults,...value};
 if(typeof c.enabled!=='boolean'||typeof c.recordMessages!=='boolean'||!['off','mention','autonomous'].includes(c.mode))throw Error('Invalid switch');
 if(!Array.isArray(c.allowedGroups)||c.allowedGroups.length>20||c.allowedGroups.some(id=>typeof id!=='string'||!/^\d{5,12}$/.test(id)))throw Error('Invalid allowed groups');
 if(!Number.isInteger(c.cooldownSeconds)||c.cooldownSeconds<10||c.cooldownSeconds>3600||!Number.isInteger(c.maxRepliesPerHour)||c.maxRepliesPerHour<1||c.maxRepliesPerHour>60)throw Error('Invalid rate limit');
 return {...c,allowedGroups:[...new Set(c.allowedGroups)]};
}
export function readControl(file){return fs.existsSync(file)?validateControl(JSON.parse(fs.readFileSync(file,'utf8'))):{...defaults,allowedGroups:[]};}
export function writeControl(file,value){
 const c=validateControl(value);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 fs.writeFileSync(file+'.tmp',JSON.stringify(c,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);return c;
}
export function groupEvent(event,selfId,c){
 if(!c.enabled||event.post_type!=='message'||event.message_type!=='group'||String(event.self_id)!==String(selfId)||!c.allowedGroups.includes(String(event.group_id)))return null;
 if(event.message_id===undefined||!/^\d{5,12}$/.test(String(event.user_id))||!Array.isArray(event.message))return null;
 const text=event.message.filter(s=>s.type==='text').map(s=>String(s.data?.text??'')).join('').trim();
 const mentioned=event.message.some(s=>s.type==='at'&&String(s.data?.qq)===String(selfId));
 const safeText=event.message.every(s=>['text','at','reply'].includes(s.type));
 return {key:`${selfId}:${event.group_id}:${event.message_id}`,group:String(event.group_id),sender:String(event.user_id),messageId:String(event.message_id),text:text.slice(0,10000),mentioned,attachments:event.message.filter(s=>!['text','at','reply'].includes(s.type)).map(s=>String(s.type).slice(0,32)),canReply:String(event.user_id)!==String(selfId)&&safeText&&text.length>0&&text.length<=2000&&(c.mode==='autonomous'||c.mode==='mention'&&mentioned)};
}
export function recordGroup(directory,row,direction='in',now=new Date()){
 if(!/^\d{5,12}$/.test(row.group))throw Error('Invalid group path');
 fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const file=path.join(directory,`group-${row.group}-${now.toISOString().slice(0,10)}.jsonl`);
 if(fs.existsSync(file)&&fs.statSync(file).size>10*1024*1024)throw Error('Daily group log limit reached');
 fs.appendFileSync(file,JSON.stringify({ts:now.toISOString(),direction,gid:row.group,uid:row.sender,mid:row.messageId,text:row.text,at:row.mentioned,attachments:row.attachments})+'\n',{mode:0o600});
 return file;
}
export class GroupEngine{
 constructor({selfId,control,record,ask,send,state={seen:[],replies:[],count:0},save=()=>{},audit=()=>{}}){Object.assign(this,{selfId,control,record,ask,send,state,save,audit});this.busy=false;}
 async receive(event,now=Date.now()){
  const c=this.control(),row=groupEvent(event,this.selfId,c);if(!row)return 'ignored';
  if(this.state.seen.includes(row.key))return 'duplicate';
  this.state.seen.push(row.key);this.state.seen=this.state.seen.slice(-10000);this.save(this.state);
  if(c.recordMessages)this.record(row);
  if(!row.canReply)return 'record_only';
  this.state.replies=this.state.replies.filter(r=>now-r.at<3600000);
  const recent=this.state.replies.filter(r=>r.group===row.group);
  if(this.busy||recent.length>=c.maxRepliesPerHour||recent.some(r=>now-r.at<c.cooldownSeconds*1000))return 'rate_limited';
  this.busy=true;
  // Count an attempt before inference/send: ambiguous sends must never be retried.
  this.state.replies.push({group:row.group,at:now});this.save(this.state);
  try{
   const reply=await this.ask(row.text);
   const latest=this.control();
   if(!groupEvent(event,this.selfId,latest)?.canReply)return 'cancelled_by_switch';
   const text=String(reply).slice(0,1500);if(!text.trim())return 'empty_reply';
   const sent=await this.send(row.group,text,latest);
   if(latest.recordMessages)this.record({...row,sender:String(this.selfId),messageId:String(sent?.message_id??'outbound'),text,mentioned:false,attachments:[]},'out');
   this.state.count++;this.save(this.state);this.audit('group_round_trip',{replyLength:text.length});return 'replied';
  }finally{this.busy=false;}
 }
}
