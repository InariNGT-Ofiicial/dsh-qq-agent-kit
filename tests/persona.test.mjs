import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {PersonaStore} from '../plugins/qq-control/persona.mjs';
import {QqPersonaService} from '../plugins/qq-control/persona-service.mjs';
import {TypertGatewayService} from '@deepseek-ai/dsh-api-gateway';
import {Context} from '@deepseek-ai/cordis';
import {remoteMethods} from '@deepseek-ai/dsh-typert-protocol';
import {loadBaselineInstructions} from '@deepseek-ai/dsh-agent-instructions';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'qq-persona-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return {root,store:new PersonaStore([{label:'test',path:root}])};}
test('preview is read-only; save backs up and preserves existing instructions; real DSH loads persona',async t=>{
 const {root,store}=await fixture(t);await fs.writeFile(path.join(root,'AGENTS.md'),'# Existing\nKeep this.\n');
 const p=await store.preview('0','Answer briefly.','Friendly fish.');assert.equal(await fs.readFile(path.join(root,'AGENTS.md'),'utf8'),'# Existing\nKeep this.\n');
 const r=await store.save('0','Answer briefly.','Friendly fish.',p.revision,p.digest);assert.equal(r.changed.length,3);const snapshot=JSON.parse(await fs.readFile(path.join(r.backup,'snapshot.json'),'utf8'));assert.equal(snapshot['AGENTS.md'],'# Existing\nKeep this.\n');
 const loaded=await loadBaselineInstructions({cwd:root,projectRoot:root,dshHome:path.join(root,'missing-home'),agentsHome:path.join(root,'missing-agents'),maxBytes:65536});assert.match(loaded.text,/Friendly fish\./);assert.match(loaded.text,/Answer briefly\./);assert.match(loaded.text,/Keep this\./);
 const next=await store.preview('0','New task.','New persona.');await store.save('0','New task.','New persona.',next.revision,next.digest);const actual=await fs.readFile(path.join(root,'AGENTS.md'),'utf8');assert.match(actual,/Keep this/);assert.doesNotMatch(actual,/Friendly fish/);assert.equal(actual.split('qq-control:persona:start').length,2);
 const same=await store.preview('0','New task.','New persona.');assert.deepEqual((await store.save('0','New task.','New persona.',same.revision,same.digest)).changed,[]);
});
test('stale preview refuses external modification and invalid targets/content',async t=>{
 const {root,store}=await fixture(t);const p=await store.preview('0','a','b');await fs.writeFile(path.join(root,'agent.md'),'external');await assert.rejects(store.save('0','a','b',p.revision,p.digest),/PREVIEW_STALE/);assert.equal(await fs.readFile(path.join(root,'agent.md'),'utf8'),'external');
 await assert.rejects(store.read('../'),/UNKNOWN_WORKSPACE/);await assert.rejects(store.preview('0','x'.repeat(17000),'b'),/INVALID_CONTENT/);await assert.rejects(store.preview('0','<!-- qq-control:persona:start -->','b'),/INVALID_CONTENT/);
});
test('hard links and junction workspaces are rejected',async t=>{
 const {root,store}=await fixture(t);await fs.writeFile(path.join(root,'outside'),'untouched');await fs.link(path.join(root,'outside'),path.join(root,'agent.md'));await assert.rejects(store.read('0'),/UNSAFE_FILE/);
 const link=path.join(root,'junction');await fs.symlink(root,link,'junction');const linked=new PersonaStore([{path:link}]);await assert.rejects(linked.read('0'),/UNSAFE_DIRECTORY/);
});
test('native Remote metadata exposes only explicit editor endpoints',async t=>{
 const {root}=await fixture(t);const ctx=new Context();const service=new QqPersonaService(ctx,[{path:root,label:'test'}]);assert.ok(ctx.qqPersona);assert.deepEqual(remoteMethods(service).map(x=>x.method).sort(),['list','preview','read','save']);assert.equal((await service.list())[0].id,'0');ctx.provide('typert',{local:{get:()=>undefined,hasSeen:()=>false},lookups:{definitions:()=>[{parameter:'agent',key:'agent'}]}});
 const gateway=new TypertGatewayService(ctx,{}),peer={id:'test',ctx,principal:{kind:'owner'},signal:new AbortController().signal,interactions:'none'};
 const invoke=(method,args)=>gateway.invoke({namespace:'qqPersona',method,args,peer});
 assert.equal((await invoke('list',{}))[0].label,'test');
 const preview=await invoke('preview',{id:'0',instructions:'Gateway agent',persona:'Gateway persona'});
 const result=await invoke('save',{id:'0',instructions:'Gateway agent',persona:'Gateway persona',revision:preview.revision,digest:preview.digest});assert.equal(result.changed.length,3);
 assert.match((await invoke('read',{id:'0'})).files['AGENTS.md'],/Gateway persona/);
});



