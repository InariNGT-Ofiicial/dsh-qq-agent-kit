import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'.local/napcat/config/webui.json'),'utf8'));
const base=`http://127.0.0.1:${config.port}/api`;
async function post(route,body={},credential){
 const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw new Error(`HTTP ${r.status}`);
 const j=await r.json();if(j.code!==0)throw new Error('Local management request failed');return j.data;
}
const auth=await post('/auth/login',{hash:createHash('sha256').update(config.token+'.napcat').digest('hex')});
if(process.argv.includes('--retry')){
 const local=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
 await post('/QQLogin/SetQuickLogin',{uin:local.selfId},auth.Credential);
}
const status=await post('/QQLogin/CheckLoginStatus',{},auth.Credential);
console.log(JSON.stringify({isLogin:status.isLogin,isOffline:status.isOffline,loginPhase:status.loginPhase,coreReady:status.coreReady,hasQr:!!status.qrcodeurl,hasLoginError:!!status.loginError,errorSummary:String(status.loginError??'').replace(/https?:\/\/\S+/g,'[url]').replace(/\d{5,}/g,'[number]').slice(0,400)},null,2));
// Never print QR login URL, management credential, password or QQ account records.
