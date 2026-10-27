import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
const file=new URL('../.local/config.json',import.meta.url);
const cfg=JSON.parse(fs.readFileSync(file,'utf8'));
if(cfg.allowedPeers.length){console.log('Already paired. Do not pair again.');process.exit(0);}
if(process.argv.includes('--renew')){
 if(!process.argv.includes('--bridge-stopped'))throw new Error('Stop the bridge first; then add --bridge-stopped.');
 cfg.pairingNonce=randomBytes(8).toString('hex');cfg.pairingExpiresAt=Date.now()+3600000;
 fs.writeFileSync(file,JSON.stringify(cfg,null,2),{mode:0o600});
}
if(!cfg.pairingNonce||Date.now()>cfg.pairingExpiresAt)throw new Error('Expired: stop bridge, run with --renew --bridge-stopped, then start bridge.');
console.log('/dsh-pair '+cfg.pairingNonce);
console.log('Send only from your main QQ to the small account in a friend private chat. Expires: '+new Date(cfg.pairingExpiresAt).toISOString());
