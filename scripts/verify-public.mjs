import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import YAML from 'js-yaml';
const root=path.resolve(import.meta.dirname,'..');
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const unique=[...new Set(files)];
const secrets=[];
const collect=(v)=>{if(typeof v==='string'&&v.length>=16)secrets.push(v);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
const config=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
secrets.push(config.selfId,config.onebotToken,...config.allowedPeers);
if(config.pairingNonce)secrets.push(config.pairingNonce);
collect(JSON.parse(fs.readFileSync(path.join(root,'.local/napcat/config/webui.json'),'utf8')));
const credentials=path.join(config.dshHome,'.credentials.yaml');
if(fs.existsSync(credentials))collect(YAML.load(fs.readFileSync(credentials,'utf8'))?.records);
for(const file of unique){
 if(/(^|\/)(node_modules|\.local|\.runtime|\.env|\.qq-control-persona)(\/|$)/.test(file))throw new Error('Private path would be published: '+file);
 const data=fs.readFileSync(path.join(root,file),'utf8');
 if(secrets.some(s=>s&&data.includes(s)))throw new Error('Local private value found in: '+file);
}
console.log(JSON.stringify({checkedFiles:unique.length,knownLocalSecretsAbsent:true,privatePathsAbsent:true}));
