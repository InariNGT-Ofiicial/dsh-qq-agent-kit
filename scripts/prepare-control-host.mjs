import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import YAML from 'js-yaml';
const root=path.resolve(import.meta.dirname,'..');const home=path.join(root,'.local/control-host');
fs.mkdirSync(home,{recursive:true});
const cli=path.join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js');
const profile=path.join(home,'profiles/web');
if(!fs.existsSync(path.join(profile,'package.json'))){const r=spawnSync(process.execPath,[cli,'--profile','web','--dump-config'],{env:{...process.env,DSH_HOME:home},stdio:'ignore'});if(r.status!==0)throw Error('Control host profile init failed');}
// Dedicated operator profile: never insert management tools into the QQ chat preset.
const patch=path.join(profile,'cordis.patch.yml');
if(fs.existsSync(patch)&&(YAML.load(fs.readFileSync(patch,'utf8'))??[]).length)throw Error('Control host override exists; inspect rather than overwrite');
fs.writeFileSync(patch,YAML.dump([{id:'qq-control',config:{connectionFile:path.join(root,'.local/control-connection.json'),enabled:false,recordMessages:false,mode:'mention',allowedGroups:[],cooldownSeconds:60,maxRepliesPerHour:10}}]));
console.log('Prepared isolated operator host; install the plugin bundle before starting.');
