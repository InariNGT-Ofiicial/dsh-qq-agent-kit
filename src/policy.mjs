export function classify(event,cfg,seen=new Set(),now=Date.now()) {
  if(event.post_type!=='message'||event.message_type!=='private'||event.sub_type!=='friend') return {kind:'ignore'};
  if(String(event.self_id)!==String(cfg.selfId)||String(event.user_id)===String(cfg.selfId)) return {kind:'ignore'};
  if(event.message_id===undefined||event.user_id===undefined) return {kind:'ignore'};
  const key=`${event.self_id}:${event.user_id}:${event.message_id}`;
  if(seen.has(key)) return {kind:'duplicate'};
  // Ignore non-text segments: attachments do not silently enter the model.
  if(!Array.isArray(event.message)||event.message.some(x=>x.type!=='text')) return {kind:'ignore'};
  const text=event.message.map(x=>x.data?.text??'').join('').trim();
  if(!text||text.length>2000) return {kind:'ignore'};
  const peer=String(event.user_id);
  if(cfg.allowedPeers.length===0&&cfg.pairingNonce&&now<=cfg.pairingExpiresAt&&text===`/dsh-pair ${cfg.pairingNonce}`) return {kind:'pair',peer,key};
  if(!cfg.allowedPeers.map(String).includes(peer)) return {kind:'denied'};
  if(!text.startsWith(cfg.commandPrefix)) return {kind:'ignore'};
  const prompt=text.slice(cfg.commandPrefix.length).trim();
  return prompt?{kind:'prompt',peer,key,prompt}:{kind:'ignore'};
}
