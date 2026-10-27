// Pipe only this lab container's diagnostic logs; suppress QR and secret material.
let text='';for await(const chunk of process.stdin)text+=chunk;
for(const line of text.split('\n').filter(l=>/error|failed|fatal|cannot|DISPLAY|X11|lock|already active/i.test(l)).slice(-20)){
 if(/token|password|secret|qrcode|二维码/i.test(line))continue;
 console.log(line.replace(/https?:\/\/\S+/g,'[url]').replace(/[A-Za-z0-9_-]{24,}/g,'[redacted]').replace(/\d{5,}/g,'[number]').slice(0,350));
}
