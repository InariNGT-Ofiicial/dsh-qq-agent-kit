import fs from 'node:fs';
import path from 'node:path';
import YAML from 'js-yaml';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
const profile=path.join(cfg.dshHome,'profiles/web');
if(!fs.existsSync(path.join(profile,'package.json'))) {
 const init=spawnSync(process.execPath,[path.join(root,'node_modules/@deepseek-ai/dsh/lib/bin.js'),'--profile','web','--dump-config'],{env:{...process.env,DSH_HOME:cfg.dshHome},stdio:'ignore'});
 if(init.status!==0)throw new Error('Failed to initialize isolated web profile');
}
fs.mkdirSync(profile,{recursive:true});
fs.writeFileSync(path.join(profile,'cordis.patch.yml'),YAML.dump([{insert:[{id:'preset-qq-lab-chat',name:'@deepseek-ai/dsh-agent-preset',config:{id:cfg.preset,order:0,plugins:[{id:'persona',name:'@deepseek-ai/dsh-persona',config:{prefix:'你是简洁的中文问答助手。仅回答当前用户的问题。',complete:true,includeRuntimeContext:false}},{id:'qq-no-tools',name:pathToFileURL(path.join(root,'src/no-tools.mjs')).href} ]}}]}]));
console.log('Wrote isolated chat preset with global tool mask and execution guard.');
