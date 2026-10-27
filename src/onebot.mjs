export async function onebot(cfg,action,params={}) {
  const allowed=new Set(['get_login_info','get_status','get_version_info','send_private_msg']);
  if(!allowed.has(action)) throw new Error('Unsupported OneBot action');
  if(action==='send_private_msg'&&!cfg.allowedPeers.map(String).includes(String(params.user_id))) throw new Error('Outbound peer denied');
  const response=await fetch(`${cfg.onebotHttp}/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${cfg.onebotToken}`},body:JSON.stringify(params),signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error(`OneBot HTTP ${response.status}`);
  const data=await response.json();
  if(data.status!=='ok'||data.retcode!==0) throw new Error(`OneBot action failed: ${data.retcode}`);
  return data.data;
}
