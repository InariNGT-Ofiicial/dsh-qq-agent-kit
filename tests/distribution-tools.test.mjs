import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'qq-distribution-test-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'scripts'));
 fs.mkdirSync(path.join(root,'.local/dsh-home/logs'),{recursive:true});
 fs.mkdirSync(path.join(root,'.local/napcat/config'),{recursive:true});
 for(const name of ['pair-code.mjs','configure-model-key.mjs','access-info.mjs'])fs.copyFileSync(new URL('../scripts/'+name,import.meta.url),path.join(root,'scripts',name));
 const file=path.join(root,'.local/config.json');
 const cfg={selfId:'10001',allowedPeers:[],pairingNonce:'expired-fixture',pairingExpiresAt:1,dshHome:path.join(root,'.local/dsh-home'),provider:'fixture-provider',model:'fixture-model'};
 fs.writeFileSync(file,JSON.stringify(cfg));
 const run=(name,args=[],input)=>spawnSync(process.execPath,[path.join(root,'scripts',name),...args],{encoding:'utf8',input});
 return {root,file,cfg,run};
}
test('pair renewal requires stopped declaration and preserves model configuration',t=>{
 const f=fixture(t);
 assert.notEqual(f.run('pair-code.mjs',['--renew']).status,0);
 const r=f.run('pair-code.mjs',['--renew','--bridge-stopped']);assert.equal(r.status,0,r.stderr);
 const saved=JSON.parse(fs.readFileSync(f.file));
 assert.equal(saved.provider,f.cfg.provider);assert.ok(saved.pairingExpiresAt>Date.now());assert.match(r.stdout,/\/dsh-pair [a-f0-9]{16}/);
 saved.allowedPeers=['10002'];fs.writeFileSync(f.file,JSON.stringify(saved));
 const before=fs.readFileSync(f.file,'utf8');assert.match(f.run('pair-code.mjs',['--renew','--bridge-stopped']).stdout,/Already paired/);assert.equal(fs.readFileSync(f.file,'utf8'),before);
});
test('key configuration preserves unrelated env and pairing without printing key',t=>{
 const f=fixture(t),env=path.join(f.cfg.dshHome,'.env'),fake='test_fixture_secret_not_real_12345';
 fs.writeFileSync(env,'KEEP=value\nDEEPSEEK_API_KEY=obsolete\n');
 const r=f.run('configure-model-key.mjs',[],fake+'\n');assert.equal(r.status,0,r.stderr);assert.ok(!(r.stdout+r.stderr).includes(fake));
 assert.equal(fs.readFileSync(env,'utf8'),'KEEP=value\nDEEPSEEK_API_KEY='+fake+'\n');
 const saved=JSON.parse(fs.readFileSync(f.file));assert.equal(saved.provider,'deepseek-official');assert.equal(saved.pairingNonce,f.cfg.pairingNonce);
 const before=fs.readFileSync(env,'utf8');assert.notEqual(f.run('configure-model-key.mjs',[],'YOUR_API_KEY_PLACEHOLDER').status,0);assert.equal(fs.readFileSync(env,'utf8'),before);
});
test('private access helper validates tunnel port and rewrites startup URL',t=>{
 const f=fixture(t);
 fs.writeFileSync(path.join(f.root,'.local/napcat/config/webui.json'),JSON.stringify({port:16099,token:'fake-admin-fixture'}));
 assert.match(f.run('access-info.mjs',['napcat','--port','26099']).stdout,/127\.0\.0\.1:26099\/webui/);
 assert.notEqual(f.run('access-info.mjs',['napcat','--port','0']).status,0);
 fs.writeFileSync(path.join(f.cfg.dshHome,'logs/server-lab.out.log'),'Ready http://127.0.0.1:13080/?token=fake-fixture\n');
 const r=f.run('access-info.mjs',['dsh','--port','23080']);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/127\.0\.0\.1:23080\/\?token=fake-fixture/);
});
