import fs from 'node:fs';
import {NodeApiClient,unwrap} from '../vendor/dsh-client.js';
const cfg=JSON.parse(fs.readFileSync(new URL('../.local/config.json',import.meta.url),'utf8'));
process.env.DSH_HOME=cfg.dshHome;
const api=new NodeApiClient(cfg.dshUrl);
for(const method of ['agentPresets/list']) {
 try {const data=unwrap(await api.callUnary(method,{}),method); console.log(method,JSON.stringify(data));}
 catch(e){console.log(method,e.message.replace(/https?:\/\/\S+/g,'[url]'));}
}
