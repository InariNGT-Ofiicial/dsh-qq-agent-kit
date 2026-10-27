import fs from 'node:fs';
const cfg=JSON.parse(fs.readFileSync(new URL('../.local/config.json',import.meta.url),'utf8'));
if(cfg.allowedPeers.length!==1)throw new Error('Requires one paired peer');
const r=await fetch(cfg.onebotHttp+'/get_friend_msg_history',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.onebotToken},body:JSON.stringify({user_id:Number(cfg.allowedPeers[0]),count:6}),signal:AbortSignal.timeout(10000)});
const j=await r.json();
console.log(JSON.stringify({status:j.status,retcode:j.retcode,messages:(j.data?.messages??[]).map(m=>{const text=Array.isArray(m.message)?m.message.filter(s=>s.type==='text').map(s=>s.data.text).join(''):String(m.message??'');return {time:m.time,fromExpectedPeer:String(m.user_id)===String(cfg.allowedPeers[0]),post_type:m.post_type,message_type:m.message_type,sub_type:m.sub_type,format:Array.isArray(m.message)?'array':typeof m.message,segmentTypes:Array.isArray(m.message)?m.message.map(s=>s.type):[],hasPrefix:text.trim().startsWith(cfg.commandPrefix),isPairCommand:text.trim().startsWith('/dsh-pair '),isExpectedTest:text.includes('QQ私聊接入通过'),length:text.length};})},null,2));
