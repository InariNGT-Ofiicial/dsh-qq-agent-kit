import fs from 'node:fs';
const [file,group]=process.argv.slice(2);if(!/^\d{5,12}$/.test(group??''))throw Error('Provide authorized group number');
const cfg=JSON.parse(fs.readFileSync(file));
async function call(action){const r=await fetch(cfg.onebotHttp+'/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.onebotToken},body:'{}',signal:AbortSignal.timeout(10000)});const j=await r.json();if(!r.ok||j.retcode!==0)throw Error('OneBot check failed');return j.data;}
const info=await call('get_login_info'),status=await call('get_status'),groups=await call('get_group_list');
console.log(JSON.stringify({expectedAccount:String(info.user_id)===String(cfg.selfId),online:status.online,memberOfRequestedGroup:groups.some(g=>String(g.group_id)===group)}));
