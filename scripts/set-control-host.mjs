import fs from 'node:fs';import path from 'node:path';import {NodeApiClient,unwrap} from '../vendor/dsh-client.js';
import {validateControl} from '../src/group-control.mjs';
const root=path.resolve(import.meta.dirname,'..');process.env.DSH_HOME=path.join(root,'.local/control-host');
let input='';for await(const c of process.stdin){input+=c;if(input.length>8192)throw Error('Too large');}
const patch=JSON.parse(input),api=new NodeApiClient('http://127.0.0.1:23080');
const descriptor=unwrap(await api.callUnary('settings/describe',{}),'settings').namespaces.find(n=>n.ns==='qq-control');
if(!descriptor)throw Error('Native settings not mounted');validateControl({...descriptor.value,...patch});
const result=unwrap(await api.callUnary('settings/mutate',{ns:descriptor.ns,ops:Object.entries(patch).map(([key,value])=>({op:'set',path:[key],value})),expectedRevision:descriptor.revision}),'settings mutate');
console.log(JSON.stringify({nativeSettingsUpdated:true,value:result.value}));
