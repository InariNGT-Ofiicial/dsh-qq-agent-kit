import fs from 'node:fs';
import path from 'node:path';
import {readControl,writeControl} from '../src/group-control.mjs';
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'.local/group-control.json');
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>8192)throw Error('Request too large');}
const request=JSON.parse(input);
if(!['get','set'].includes(request.action))throw Error('Unknown action');
const controls=request.action==='set'?writeControl(file,request.controls):readControl(file);
const stateFile=path.join(root,'.local/group-state.json');
const state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile)):{count:0,seen:[]};
console.log(JSON.stringify({controls,replies:state.count,observedMessages:state.seen.length,logDirectory:'.local/group-messages'}));
