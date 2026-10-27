// Key enters via stdin, never command-line arguments or output.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
if(process.stdin.isTTY)throw new Error('Use the documented hidden-input wrapper; do not pass the key as an argument.');
let key='';for await(const part of process.stdin){key+=part;if(key.length>4096)throw new Error('Input too long');}
key=key.trim();if(!/^[A-Za-z0-9_-]{16,}$/.test(key)||/FROM_ENV|YOUR_API/i.test(key))throw new Error('Invalid literal API key');
const file=path.join(root,'.local/config.json'),cfg=JSON.parse(fs.readFileSync(file,'utf8'));
const envFile=path.join(cfg.dshHome,'.env');
let env=fs.existsSync(envFile)?fs.readFileSync(envFile,'utf8'):'';
env=env.split(/\r?\n/).filter(l=>!/^\s*(?:export\s+)?DEEPSEEK_API_KEY\s*=/.test(l)).join('\n').trimEnd();
fs.writeFileSync(envFile,(env?env+'\n':'')+'DEEPSEEK_API_KEY='+key+'\n',{mode:0o600});
cfg.provider='deepseek-official';cfg.model='deepseek-flash';fs.writeFileSync(file,JSON.stringify(cfg,null,2),{mode:0o600});
console.log('Saved model key privately; provider=deepseek-official. Restart isolated DSH, then run smoke-dsh.');
