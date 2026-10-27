// Run only while the isolated DSH instance is stopped. No credential values are printed.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'js-yaml';
const cfg=JSON.parse(fs.readFileSync(new URL('../.local/config.json',import.meta.url),'utf8'));
const source=process.argv[2];
if(!source)throw new Error('Usage: node scripts/import-account.mjs <existing DSH home>');
const from=YAML.load(fs.readFileSync(path.join(source,'.credentials.yaml'),'utf8'));
const target=path.join(cfg.dshHome,'.credentials.yaml');
const dest=fs.existsSync(target)?YAML.load(fs.readFileSync(target,'utf8')):{};
dest.records??={};
for(const key of ['deepseek-account-platform/device','deepseek-account-platform/default']) {
 if(!from.records?.[key])throw new Error('Required account record unavailable');
 dest.records[key]=from.records[key];
}
fs.writeFileSync(target,YAML.dump(dest),{mode:0o600});
console.log('Imported only DeepSeek account/device records into ignored local home.');
