import fs from 'node:fs';import path from 'node:path';import {NodeApiClient,unwrap} from '../vendor/dsh-client.js';
const root=path.resolve(import.meta.dirname,'..');process.env.DSH_HOME=path.join(root,'.local/control-host');
const api=new NodeApiClient('http://127.0.0.1:23080');
const plugins=unwrap(await api.callUnary('pluginManager/listPlugins',{}),'plugins');
const matches=plugins.filter(p=>JSON.stringify(p).includes('qq-control'));
const settings=unwrap(await api.callUnary('settings/describe',{}),'settings');
fs.writeFileSync(path.join(root,'.local/control-settings-description.json'),JSON.stringify(settings,null,2),{mode:0o600});
console.log(JSON.stringify({host:'0.2.1-rc.2',plugin:matches,settingsTopLevel:Object.keys(settings),nativeSettingsContainsControl:JSON.stringify(settings).includes('群聊总开关')},null,2));
