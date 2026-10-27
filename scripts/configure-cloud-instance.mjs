// Run only after init, before services/container creation, in a fresh directory.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),local=path.join(root,'.local');
if(fs.existsSync(path.join(local,'systemd'))||fs.existsSync(path.join(local,'bridge-state.json')))throw new Error('Existing instance: refusing to change deployment identity');
const arg=n=>process.argv[process.argv.indexOf(n)+1];
const name=arg('--name'),offset=Number(arg('--port-offset'));
if(!/^dsh-qq-[a-z0-9-]{1,40}$/.test(name??'')||!Number.isInteger(offset)||offset<0||16099+offset>65535)throw new Error('Usage: --name dsh-qq-NAME --port-offset NUMBER [--no-auto-login]');
const file=path.join(local,'config.json'),cfg=JSON.parse(fs.readFileSync(file));
cfg.instanceName=name;cfg.onebotHttp=`http://127.0.0.1:${13000+offset}`;cfg.onebotWs=`ws://127.0.0.1:${13001+offset}`;cfg.dshUrl=`http://127.0.0.1:${13080+offset}`;
const webfile=path.join(local,'napcat/config/webui.json'),web=JSON.parse(fs.readFileSync(webfile));web.port=16099+offset;
if(process.argv.includes('--no-auto-login'))web.autoLoginAccount='';
const obfile=path.join(local,'napcat/config',`onebot11_${cfg.selfId}.json`),ob=JSON.parse(fs.readFileSync(obfile));
ob.network.httpServers[0].port=13000+offset;ob.network.websocketServers[0].port=13001+offset;
for(const [p,v] of [[file,cfg],[webfile,web],[obfile,ob]])fs.writeFileSync(p,JSON.stringify(v,null,2),{mode:0o600});
console.log(JSON.stringify({instanceName:name,ports:[13000+offset,13001+offset,13080+offset,web.port],autoLogin:!!web.autoLoginAccount}));
