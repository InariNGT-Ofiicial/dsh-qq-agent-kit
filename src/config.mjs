import fs from 'node:fs';
export function savePairing(file,peer){
 const current=JSON.parse(fs.readFileSync(file,'utf8'));
 if(current.allowedPeers.length!==0)throw new Error('Pairing already configured');
 current.allowedPeers=[peer];delete current.pairingNonce;delete current.pairingExpiresAt;
 fs.writeFileSync(file,JSON.stringify(current,null,2),{mode:0o600});
 return current;
}
