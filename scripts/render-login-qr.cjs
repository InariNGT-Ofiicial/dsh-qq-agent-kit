const fs=require('node:fs');
const path=require('node:path');
const qr=require('../.runtime/qr/node_modules/qrcode');
const root=path.resolve(__dirname,'..');
const value=fs.readFileSync(path.join(root,'.local/login-qr-url.txt'),'utf8').trim();
qr.toFile(path.join(root,'.local/cloud-qq-login.png'),value,{width:360,margin:3,errorCorrectionLevel:'M'}).then(()=>console.log('Rendered private login QR locally.'));
