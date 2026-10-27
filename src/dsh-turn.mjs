import {NodeApiClient,unwrap,createTurnCollector} from '../vendor/dsh-client.js';
export async function askDsh(cfg,text) {
 process.env.DSH_HOME=cfg.dshHome;
 const api=new NodeApiClient(cfg.dshUrl,15000);
 const presets=unwrap(await api.agentPresets.list({}),'presets');
 const preset=presets.presets.find(p=>p.id===cfg.preset);
 if(!preset||preset.broken)throw new Error('Required restricted preset is unavailable');
 const ws=unwrap(await api.workspace.create({path:cfg.workspace}),'workspace');
 const {sessionId}=unwrap(await api.sessions.create({workspaceId:ws.workspace.workspaceId,agentPreset:cfg.preset}),'session');
 const abort=new AbortController();
 let resolveReady,resolveDone,rejectDone;
 const ready=new Promise(r=>resolveReady=r);
 const done=new Promise((r,j)=>{resolveDone=r;rejectDone=j;});
 done.catch(()=>{});
 const collector=createTurnCollector();
 const stream=api.events.mux({},abort.signal);
 stream.follow(sessionId);
 const pump=(async()=>{try{for await(const envelope of stream){
   const f=envelope.payload;
   if(f.type==='stream/error')throw new Error('DSH event stream failed');
   if(f.sessionId!==sessionId)continue;
   if(f.type==='session/snapshot')resolveReady();
   if(f.type==='approval/requested'||f.type==='question/requested')throw new Error('Unexpected interactive/tool request');
   if(f.type==='session/event'){
     const result=collector.push(f.event);
     if(result){if(!result.text)throw new Error('DSH completed without text');resolveDone(result);}
   }
 }}catch(e){if(!abort.signal.aborted)rejectDone(e);}})();
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('DSH turn timeout')),90000);});
 try {
   await Promise.race([ready,timeout,done]);
   unwrap(await api.sessions.selectModel({sessionId,provider:cfg.provider,model:cfg.model,reasoningEffort:'low'}),'model');
   unwrap(await api.sessions.prompt({sessionId,mode:'queue',content:[{type:'text',text}]}),'prompt');
   return await Promise.race([done,timeout]);
 } finally {
   clearTimeout(timer);
   await api.stopSessionWork(sessionId).catch(()=>{});
   abort.abort();await pump;
   await api.workspace.archiveSession({sessionId}).catch(()=>{});
 }
}
