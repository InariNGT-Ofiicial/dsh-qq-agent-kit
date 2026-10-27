import fs from 'node:fs';
import path from 'node:path';
import {onebot} from '../src/onebot.mjs';
const cfg=JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname,'../.local/config.json'),'utf8'));
const result={at:new Date().toISOString(),onebot:{},dsh:{},realMessageRoundTrip:false};
const statePath=path.resolve(import.meta.dirname,'../.local/bridge-state.json');
if(fs.existsSync(statePath))result.realMessageRoundTrip=JSON.parse(fs.readFileSync(statePath,'utf8')).replies>0;
try {
 const login=await onebot(cfg,'get_login_info');
 const status=await onebot(cfg,'get_status');
 const version=await onebot(cfg,'get_version_info');
 result.onebot={reachable:true,expectedAccount:String(login.user_id)===cfg.selfId,online:status.online,good:status.good,version:version.app_version};
}catch(e){result.onebot={reachable:false,error:e.message};}
try {const r=await fetch(cfg.dshUrl,{signal:AbortSignal.timeout(5000)});result.dsh={reachable:true,httpStatus:r.status};}catch(e){result.dsh={reachable:false,error:e.message};}
console.log(JSON.stringify(result,null,2));
process.exitCode=result.onebot.expectedAccount&&result.onebot.online&&result.dsh.reachable?0:1;
