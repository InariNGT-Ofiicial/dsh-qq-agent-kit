import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
export async function controlRequest(connectionFile,request){
 if(!connectionFile)throw Error('Configure the private connection file first');
 const c=JSON.parse(fs.readFileSync(connectionFile,'utf8'));
 let command,args;
 if(c.type==='local'){
  command=process.execPath;args=[path.join(c.directory,'scripts/group-control-cli.mjs')];
 }else if(c.type==='ssh'){
  if(!/^[A-Za-z0-9_./-]+$/.test(c.directory)||!Array.isArray(c.sshArgs)||c.sshArgs.some(x=>typeof x!=='string'))throw Error('Invalid SSH connection');
  command='ssh';args=[...c.sshArgs,`cd ${c.directory} && ${c.nodePath??'node'} scripts/group-control-cli.mjs`];
  if(c.nodePath&&!/^\/[A-Za-z0-9_./-]+$/.test(c.nodePath))throw Error('Invalid node path');
 }else throw Error('Unknown connection type');
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{windowsHide:true,stdio:['pipe','pipe','pipe']});let output='';
  const timer=setTimeout(()=>{child.kill();reject(Error('Control connection timeout'));},20000);
  child.stdout.on('data',b=>{output+=b;if(output.length>65536){child.kill();reject(Error('Oversized response'));}});
  child.stderr.resume();child.on('error',()=>{clearTimeout(timer);reject(Error('Control connection unavailable'));});
  child.on('close',code=>{clearTimeout(timer);try{if(code!==0)throw Error();resolve(JSON.parse(output));}catch{reject(Error('Control request failed'));}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(request));
 });
}
