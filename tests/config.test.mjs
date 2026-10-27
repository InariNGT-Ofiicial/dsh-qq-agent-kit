import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {savePairing} from '../src/config.mjs';
test('pairing preserves model configuration changed after listener startup',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qq-pair-'));const file=path.join(dir,'config.json');
 try{fs.writeFileSync(file,JSON.stringify({allowedPeers:[],provider:'deepseek-account',pairingNonce:'test',pairingExpiresAt:123}));
 const c=savePairing(file,'test-peer');assert.equal(c.provider,'deepseek-account');assert.deepEqual(c.allowedPeers,['test-peer']);assert.equal(c.pairingNonce,undefined);assert.throws(()=>savePairing(file,'different-peer'),/already/);
 }finally{fs.rmSync(file);fs.rmdirSync(dir);}
});
