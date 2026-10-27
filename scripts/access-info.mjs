// Deliberately displays local administrative login material to its owner.
// Run privately, never include this output in recordings or shared diagnostics.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const kind=process.argv[2];
const portArg=process.argv.indexOf('--port');
const port=portArg>=0?Number(process.argv[portArg+1]):undefined;
if(port!==undefined&&(!Number.isInteger(port)||port<1||port>65535))throw new Error('Invalid local tunnel port');
if(kind==='napcat'){
 const c=JSON.parse(fs.readFileSync(path.join(root,'.local/napcat/config/webui.json'),'utf8'));
 console.log(`Open: http://127.0.0.1:${port??c.port}/webui`);
 console.log('Private management token: '+c.token);
}else if(kind==='dsh'){
 const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
 const files=[path.join(cfg.dshHome,'logs/server-lab.out.log'),path.join(root,'.local/dsh-qq-personal-model.out.log')].filter(f=>fs.existsSync(f)).sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
 const urls=files.length?fs.readFileSync(files[0],'utf8').match(/https?:\/\/127\.0\.0\.1:\d+\/[^\s]*token=[^\s]+/g):null;
 if(!urls?.length)throw new Error('No current DSH startup URL found; check the isolated DSH is running.');
 const u=new URL(urls.at(-1));if(port)u.port=String(port);console.log('Private DSH startup URL: '+u.href);
}else throw new Error('Usage: node scripts/access-info.mjs napcat|dsh [--port local-tunnel-port]');
