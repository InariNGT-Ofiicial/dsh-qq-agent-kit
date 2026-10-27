import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(import.meta.dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
if(process.platform!=='linux')throw new Error('Linux only');
if(!/^[A-Za-z0-9_./-]+$/.test(root))throw new Error('Unsupported service path');
const user=os.userInfo().username;
if(!/^[a-z_][a-z0-9_-]*$/.test(user))throw new Error('Unsupported user name');
const node=path.join(root,'.runtime/node-v24.21.0-linux-x64/bin/node');
const webFile=path.join(root,'.local/napcat/config/webui.json');
const web=JSON.parse(fs.readFileSync(webFile,'utf8'));web.host='0.0.0.0';fs.writeFileSync(webFile,JSON.stringify(web));
const obFile=path.join(root,'.local/napcat/config',`onebot11_${cfg.selfId}.json`);
const ob=JSON.parse(fs.readFileSync(obFile,'utf8'));
for(const kind of ['httpServers','websocketServers'])for(const s of ob.network[kind])s.host='0.0.0.0';
fs.writeFileSync(obFile,JSON.stringify(ob));
fs.writeFileSync(path.join(root,'.local/napcat/config/onebot11.json'),JSON.stringify(ob));
fs.mkdirSync(path.join(root,'.local/qq'),{recursive:true});
fs.mkdirSync(path.join(root,'.local/systemd'),{recursive:true});
fs.mkdirSync(path.join(cfg.dshHome,'logs'),{recursive:true});
for(const [name,cmd,limit] of [
 ['dsh-qq-personal-model',`${node} ${root}/node_modules/@deepseek-ai/dsh/lib/bin.js web --host 127.0.0.1 --port 13080 --no-open`,'384M'],
 ['dsh-qq-personal-bridge',`${node} ${root}/src/bridge.mjs`,'128M']
]){
for(const suffix of ['out','err']){
 const log=path.join(root,'.local',`${name}.${suffix}.log`);
 if(!fs.existsSync(log))fs.writeFileSync(log,'',{mode:0o600});
}
const unit=`[Unit]\nDescription=${name}\nAfter=network-online.target\nWants=network-online.target\nStartLimitIntervalSec=300\nStartLimitBurst=5\n\n[Service]\nType=simple\nUser=${user}\nWorkingDirectory=${root}\nEnvironment=DSH_HOME=${cfg.dshHome}\nEnvironment=DSH_TELEMETRY_DISABLED=1\nEnvironment=NODE_OPTIONS=--max-old-space-size=256\nExecStart=${cmd}\nRestart=on-failure\nRestartSec=10\nUMask=0077\nNoNewPrivileges=true\nMemoryMax=${limit}\nTasksMax=128\nStandardOutput=append:${root}/.local/${name}.out.log\nStandardError=append:${root}/.local/${name}.err.log\n\n[Install]\nWantedBy=multi-user.target\n`;
fs.writeFileSync(path.join(root,'.local/systemd',name+'.service'),unit);
}
console.log('Prepared dedicated units and container-internal listeners; publish only to host loopback.');
