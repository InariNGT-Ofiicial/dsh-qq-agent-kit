// Run on the target host only. Reads a user-authorized env file; never prints the key.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/config.json'),'utf8'));
const source=process.argv[2];if(!source)throw new Error('Supply authorized env file path');
const match=fs.readFileSync(source,'utf8').match(/^\s*(?:export\s+)?DEEPSEEK_API_KEY\s*=\s*(.+)$/m);
if(!match)throw new Error('Model key absent');
let key=match[1].trim();if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1);
if(!/^[A-Za-z0-9_-]{16,}$/.test(key)||key.includes('FROM_ENV'))throw new Error('Model key is not a literal valid value');
fs.writeFileSync(path.join(cfg.dshHome,'.env'),'DEEPSEEK_API_KEY='+key+'\n',{mode:0o600});
console.log('Copied only model API key to isolated cloud DSH env.');
