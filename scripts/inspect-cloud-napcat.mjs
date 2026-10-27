// Read-only. Pipe into an existing NapCat container: node - <expected QQ number>.
import fs from 'node:fs';
const root=process.argv[3]??'/app/napcat/config';
const expected=process.argv[2];
if(!/^\d{5,12}$/.test(expected??''))throw new Error('Expected account required');
const files=fs.readdirSync(root);
const accounts=[...new Set(files.map(n=>n.match(/(?:onebot11|napcat_protocol|napcat)_(\d+)\.json$/)?.[1]).filter(Boolean))];
const report={configuredAccounts:accounts.length,expectedAccountConfigPresent:accounts.includes(expected),webui:{},onebot:[]};
if(files.includes('webui.json')){const c=JSON.parse(fs.readFileSync(root+'/webui.json','utf8'));report.webui={host:c.host,port:c.port,hasToken:!!c.token};}
for(const file of files.filter(n=>/^onebot11_\d+\.json$/.test(n))){
 const c=JSON.parse(fs.readFileSync(root+'/'+file,'utf8'));
 for(const kind of ['httpServers','websocketServers','websocketClients'])for(const x of c.network?.[kind]??[])report.onebot.push({kind,enabled:x.enable,host:x.host,port:x.port,hasToken:!!x.token});
}
console.log(JSON.stringify(report,null,2));
