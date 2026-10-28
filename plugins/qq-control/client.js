window.__ModuleLoader__.load({id:'dsh-qq-control',factory:(require)=>{
 const React=require('react'), h=React.createElement;
 const inject=['slots','configForms','connection'];
 function apply(ctx){
  const form=ctx.configForms.get('qq-control');
  async function rpc(method,args={}){
   const result=await ctx.connection.rpc.call('/api','qqPersona/'+method,{args});
   if(!result.ok)throw new Error(result.error?.message||'操作失败');return result.value;
  }
  function PersonaPanel(){
   const [items,itemsSet]=React.useState([]),[id,idSet]=React.useState(''),[agent,agentSet]=React.useState(''),[persona,personaSet]=React.useState(''),[preview,previewSet]=React.useState(null),[busy,busySet]=React.useState(false),[note,noteSet]=React.useState('');
   React.useEffect(()=>{let active=true;rpc('list').then(v=>{if(active)itemsSet(v);}).catch(()=>{if(active)noteSet('人格服务未连接。');});return()=>{active=false;};},[]);
   async function action(fn){busySet(true);try{await fn();}catch(e){previewSet(null);noteSet('未确认保存：'+e.message);}finally{busySet(false);}}
   async function load(value){idSet(value);previewSet(null);agentSet('');personaSet('');if(value)await action(async()=>{const r=await rpc('read',{id:value});agentSet(r.files['agent.md']||'');personaSet(r.files['PERSONA.md']||'');noteSet('已读取；编辑后先预览再保存。');});}
   const edit=(setter,value)=>{setter(value);previewSet(null);};
   return h('section',{'aria-label':'Agent 与人格文件',style:{borderTop:'2px solid #888',marginTop:24,paddingTop:12}},
    h('h3',null,'Agent 与人格文件'),
    h('p',null,'只写所选本地工作区。agent.md / PERSONA.md 为编辑源，实际内容合并至 AGENTS.md。不会自动更改在线 QQ 的人格。'),
    h('select',{'aria-label':'人格工作区',value:id,disabled:busy,onChange:e=>load(e.target.value)},h('option',{value:''},'选择 Agent 已配置的工作区'),...items.map(w=>h('option',{key:w.id,value:w.id},w.label+' — '+w.path))),
    !items.length&&h('p',null,'尚未配置目标目录，请让部署 Agent 设置 personaWorkspaces；默认禁止写入。'),
    h('label',{style:{display:'block',marginTop:12}},'agent.md：工作约定',h('textarea',{'aria-label':'agent.md',rows:6,value:agent,disabled:busy||!id,onChange:e=>edit(agentSet,e.target.value),style:{display:'block',width:'100%'}})),
    h('label',{style:{display:'block',marginTop:12}},'PERSONA.md：人格设定',h('textarea',{'aria-label':'PERSONA.md',rows:6,value:persona,disabled:busy||!id,onChange:e=>edit(personaSet,e.target.value),style:{display:'block',width:'100%'}})),
    h('button',{disabled:busy||!id,onClick:()=>action(async()=>{previewSet(await rpc('preview',{id,instructions:agent,persona}));noteSet('请检查下方完整 AGENTS.md；保存会保留原文件快照。');})},'预览写入'),
    preview&&h('div',null,h('p',null,'将更新：'+(preview.changed.join('、')||'无变化')),h('pre',{style:{whiteSpace:'pre-wrap',maxHeight:300,overflow:'auto'}},preview.files['AGENTS.md']),h('button',{disabled:busy,onClick:()=>action(async()=>{const r=await rpc('save',{id,instructions:agent,persona,revision:preview.revision,digest:preview.digest});previewSet(null);noteSet('保存完成。'+(r.backup?'恢复快照：'+r.backup:'无文件变化。')+' 请在此工作区新建包含 agent-instructions 的会话验收；在线 QQ 尚未应用。');})},'确认保存这份预览')),
    h('p',{role:'status'},busy?'处理中…':note));
  }
  function Panel(){
   const s=React.useSyncExternalStore(fn=>form.subscribe(fn),()=>form.getSnapshot());
   const [busy,setBusy]=React.useState(false),[note,setNote]=React.useState('');
   if(s.status!=='ready')return h('p',null,'正在读取中控配置…');
   const v=s.value;
   async function set(k,value){setBusy(true);try{setNote(await form.set(k,value)?'设置已保存；Agent 可通过状态工具核对远端同步。':'保存失败，请重新检查。');}catch{setNote('连接失败，未确认保存。');}finally{setBusy(false);}}
   const row=(label,control,help)=>h('label',{style:{display:'grid',gridTemplateColumns:'220px 1fr',gap:12,alignItems:'center',padding:'14px 0',borderBottom:'1px solid #ddd'}},h('span',null,label),h('span',null,control,help&&h('small',{style:{display:'block',marginTop:6,opacity:.7}},help)));
   const input=(key,label)=>h('input',{type:'checkbox',role:'switch','aria-label':label,checked:v[key],disabled:busy||!s.writable,onChange:e=>set(key,e.target.checked),style:{width:24,height:24}});
   return h('section',{'aria-label':'QQ 中控设置',style:{maxWidth:760,padding:'12px 0'}},
    h('h3',null,'QQ 中控'),h('p',null,'只作用于授权群；不退出 QQ，也不停止既有私聊。'),
    row('群聊总开关',input('enabled','群聊总开关'),'关闭后不处理新的群消息。'),
    row('群消息落盘',input('recordMessages','群消息落盘'),'普通消息也记录；附件只记类型，不下载。'),
    row('对话模式',h('select',{'aria-label':'对话模式',value:v.mode,disabled:busy,onChange:e=>set('mode',e.target.value),style:{padding:8,fontSize:16}},...Object.entries({off:'只记录，不回复',mention:'仅 @ 时回复',autonomous:'自主参与（无需 @）'}).map(([value,label])=>h('option',{key:value,value},label)))),
    row('授权群号',h('input',{'aria-label':'授权群号',defaultValue:v.allowedGroups.join(', '),key:v.allowedGroups.join(','),disabled:busy,onBlur:e=>{const a=e.target.value.split(/[\s,，]+/).filter(Boolean);if(a.length>20||a.some(x=>!/^\d{5,12}$/.test(x))){setNote('群号格式不正确；未保存。');return;}if(JSON.stringify(a)!==JSON.stringify(v.allowedGroups))set('allowedGroups',a);},style:{padding:8,width:'95%'}}),'多个群以逗号分隔；只填写明确获准的群。'),
    ...[['cooldownSeconds','回复冷却（秒）',10,3600],['maxRepliesPerHour','每小时回复上限',1,60]].map(([key,label,min,max])=>row(label,h('input',{type:'number','aria-label':label,defaultValue:v[key],key:v[key],min,max,disabled:busy,onBlur:e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=min&&n<=max&&n!==v[key])set(key,n);},style:{padding:8,width:100}}))),
    h('p',{role:'status'},busy?'正在保存…':note),h(PersonaPanel));
  }
  ctx.effect(()=>ctx.slots.inject('plugins.bundle.config',()=>ctx.slots.register({name:'plugins.bundle.config',id:'qq-control-panel',key:'dsh-qq-control'},Panel)));
 }
 return {inject,apply};
}});

