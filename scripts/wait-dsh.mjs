// Authenticated readiness, not a fixed sleep or an unauthenticated HTTP status.
import fs from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {NodeApiClient,unwrap} from '../vendor/dsh-client.js';
const cfg=JSON.parse(fs.readFileSync(new URL('../.local/config.json',import.meta.url)));
process.env.DSH_HOME=cfg.dshHome;
const end=Date.now()+90000;
while(Date.now()<end){
 try{
  const api=new NodeApiClient(cfg.dshUrl,2000);
  const data=unwrap(await api.agentPresets.list({}),'presets');
  if(data.presets.some(p=>p.id===cfg.preset&&!p.broken)){
   console.log(JSON.stringify({ready:true,preset:cfg.preset}));process.exit(0);
  }
 }catch{}
 await delay(2000);
}
throw new Error('Isolated DSH preset not ready within 90 seconds; inspect private service diagnostics.');
