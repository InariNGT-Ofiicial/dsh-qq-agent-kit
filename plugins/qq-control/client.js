window.__ModuleLoader__.load({id:'dsh-qq-control',factory:(require)=>{
 const React=require('react'), h=React.createElement;
 const inject=['slots','configForms'];
 function apply(ctx){
  const form=ctx.configForms.get('qq-control');
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
    h('p',{role:'status'},busy?'正在保存…':note));
  }
  ctx.effect(()=>ctx.slots.inject('plugins.bundle.config',()=>ctx.slots.register({name:'plugins.bundle.config',id:'qq-control-panel',key:'dsh-qq-control'},Panel)));
 }
 return {inject,apply};
}});

