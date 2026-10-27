// Run on the protocol host. Writes private QR URL, never prints it.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/napcat/config/webui.json'),'utf8'));
const base=`http://127.0.0.1:${cfg.port}/api`;
async function post(route,body,credential){
const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(credential?{Authorization:'Bearer '+credential}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
const j=await r.json();if(!r.ok||j.code!==0)throw new Error('Local management request failed');return j.data;
}
const auth=await post('/auth/login',{hash:createHash('sha256').update(cfg.token+'.napcat').digest('hex')});
const status=await post('/QQLogin/CheckLoginStatus',{},auth.Credential);
if(status.isLogin){console.log('Already logged in; no QR exported');process.exit(0);}
if(process.argv.includes('--refresh'))await post('/QQLogin/RefreshQRcode',{},auth.Credential);
const qr=await post('/QQLogin/GetQQLoginQrcode',{},auth.Credential);
if(typeof qr.qrcode!=='string'||!qr.qrcode)throw new Error('QR not ready');
fs.writeFileSync(path.join(root,'.local/login-qr-url.txt'),qr.qrcode,{mode:0o600});
console.log('Saved private login QR for account owner.');
