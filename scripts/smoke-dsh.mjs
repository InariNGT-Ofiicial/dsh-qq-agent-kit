import fs from 'node:fs';
import {askDsh} from '../src/dsh-turn.mjs';
const cfg=JSON.parse(fs.readFileSync(new URL('../.local/config.json',import.meta.url),'utf8'));
const result=await askDsh(cfg,'这是本机接入测试。请只回复：DSH本机测试通过');
console.log(JSON.stringify({at:new Date().toISOString(),modelReply:result.text,reason:result.reason}));
