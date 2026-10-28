import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import YAML from 'js-yaml';
import {loadBaselineInstructions} from '@deepseek-ai/dsh-agent-instructions';
const root=path.resolve(import.meta.dirname,'..'),patch=path.join(root,'.local/control-host/profiles/web/cordis.patch.yml'),backup=path.join(root,'.local/persona-ui-original-patch.yml'),workspace=path.join(root,'.local/persona-ui-rehearsal');
const action=process.argv[2];
if(action==='prepare'){
 const bytes=await fs.readFile(patch);await fs.writeFile(backup,bytes,{flag:'wx',mode:0o600});
 const config=YAML.load(bytes.toString());const control=config.find(x=>x.id==='qq-control');if(!control)throw Error('Missing control config');
 await fs.mkdir(workspace,{recursive:true});control.config.connectionFile='';control.config.personaWorkspaces=[{label:'人格文件隔离演练',path:workspace}];await fs.writeFile(patch,YAML.dump(config));console.log('Local rehearsal prepared; remote connection disabled. Restart only operator host.');
}else if(action==='restore'){
 const bytes=await fs.readFile(backup);await fs.writeFile(patch,bytes);console.log('Original operator configuration restored byte-for-byte. Restart only operator host; retain backup privately.');
}else if(action==='verify'){
 const files={};for(const name of ['agent.md','PERSONA.md','AGENTS.md'])files[name]=await fs.readFile(path.join(workspace,name),'utf8');
 if(!files['AGENTS.md'].includes(files['agent.md'])||!files['AGENTS.md'].includes(files['PERSONA.md']))throw Error('Source mismatch');
 const loaded=await loadBaselineInstructions({cwd:workspace,projectRoot:workspace,dshHome:path.join(workspace,'absent-home'),agentsHome:path.join(workspace,'absent-agents'),maxBytes:65536});
 if(!loaded?.text.includes(files['PERSONA.md']))throw Error('DSH loader mismatch');
 const result={date:new Date().toISOString(),plugin:'0.2.1',host:'0.2.1-rc.2',sourceMatchesGenerated:true,realDshLoaderContainsPersona:true,fileHashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]))};
 await fs.writeFile(path.join(root,'evidence/persona-ui-files.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}else throw Error('Usage: node scripts/persona-ui-rehearsal.mjs prepare|verify|restore');
