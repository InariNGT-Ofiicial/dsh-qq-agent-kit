import z from '@deepseek-ai/schemastery';
import {defineTool} from '@deepseek-ai/dsh-tools';
import {controlRequest} from './transport.mjs';
export const name='qq-control';
export const inject=['tools'];
let syncQueue=Promise.resolve();
export const Config=z.object({
 connectionFile:z.string().default('').description('私密连接配置文件（由Agent设置，不填写密钥）'),
 enabled:z.boolean().default(false).description('群聊总开关（不停止既有私聊）').volatile(),
 recordMessages:z.boolean().default(false).description('授权群消息落盘：未@的消息也记录').volatile(),
 mode:z.union(['off','mention','autonomous']).default('mention').description('off：不回复；mention：仅@回复；autonomous：无需@自主参与').volatile(),
 allowedGroups:z.array(z.string()).default([]).description('授权群号；仅管理这些群，留空不处理任何群').volatile(),
 cooldownSeconds:z.natural().min(10).max(3600).default(60).description('同群回复冷却秒数').volatile(),
 maxRepliesPerHour:z.natural().min(1).max(60).default(10).description('每群每小时最多回复尝试次数').volatile()
});
export function apply(ctx,config){
 let current={configured:false},disposed=false,requested='',retryAt=0;
 const {connectionFile}=config;
 const sync=()=>{
  if(disposed||!connectionFile||Date.now()<retryAt)return;
  const controls=Object.fromEntries(Object.entries(config).filter(([k])=>k!=='connectionFile').map(([k,v])=>[k,v.get()]));
  const hash=JSON.stringify(controls);if(hash===requested)return;requested=hash;
  syncQueue=syncQueue.then(async()=>{if(disposed)return;const value=await controlRequest(connectionFile,{action:'set',controls});current={configured:true,...value};ctx.logger.info('QQ中控配置已同步；不改变QQ登录状态。');}).catch(()=>{requested='';retryAt=Date.now()+10000;current={configured:true,error:'CONTROL_SYNC_FAILED'};ctx.logger.warn('QQ中控同步失败，请检查私密连接和远端控制脚本。');});
 };
 sync();const timer=setInterval(sync,500);timer.unref?.();
 ctx.effect(()=>()=>{disposed=true;clearInterval(timer);});
 ctx.tools.register(defineTool({name:'qq_control_status',description:'只读查看QQ群聊中控开关和计数。修改请使用DSH插件设置；不读取聊天正文或登录凭据。',parameters:{},output:{schema:{type:'string'},render:(_a,value)=>[{type:'text',text:value}]},async execute(){sync();await syncQueue;if(disposed)return JSON.stringify({error:'PLUGIN_DISPOSED'});if(!connectionFile)return JSON.stringify(current);try{return JSON.stringify(await controlRequest(connectionFile,{action:'get'}));}catch{return JSON.stringify({error:'CONTROL_UNAVAILABLE'});}}}));
}
