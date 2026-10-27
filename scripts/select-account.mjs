import fs from 'node:fs';
const p=new URL('../.local/config.json',import.meta.url);
const cfg=JSON.parse(fs.readFileSync(p,'utf8'));
cfg.provider='deepseek-account';
cfg.model='deepseek-flash';
fs.writeFileSync(p,JSON.stringify(cfg,null,2),{mode:0o600});
console.log('Selected DeepSeek account provider; verify availability using smoke-dsh.');
