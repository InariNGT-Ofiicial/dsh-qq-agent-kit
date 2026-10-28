from pathlib import Path
import json,html,math
base=Path(__file__).parent; root=base
pars=json.loads((root/'alignment.json').read_text(encoding='utf-8'))['paragraphs']
esc=html.escape
css='''@font-face{font-family:DSFont;src:url('assets/fonts/NotoSansSC.ttf')}*{box-sizing:border-box}#root{position:absolute;inset:0;font-family:DSFont;color:#17365e}.paper{position:absolute;inset:0;background:#f5faff}.rail{position:absolute;left:100px;top:78px;width:8px;height:75px;background:#2679d9}.chapter{position:absolute;left:135px;top:72px;font-size:42px;font-weight:700}.tag{position:absolute;right:120px;top:82px;font-size:28px;color:#3b5574}.shot{position:absolute;inset:0}.panel{position:absolute;left:110px;top:180px;width:1080px;height:720px;border:5px solid #17365e;background-size:200% 200%;background-repeat:no-repeat;overflow:hidden}.bubble{position:absolute;text-align:center;font-size:32px;line-height:1.3;font-weight:700;white-space:pre-line}.aside{position:absolute;left:1250px;top:195px;width:540px}.aside h2{font-size:62px;line-height:1.3;margin:0 0 28px;font-weight:800;white-space:pre-line}.aside p{font-size:33px;line-height:1.55;margin:0;white-space:pre-line}.speaker{position:absolute;left:1220px;top:440px;width:650px;height:660px;object-fit:contain;object-position:center bottom}.name{position:absolute;left:1510px;top:906px;font-size:28px;color:#3b5574}.accent{color:#2164b2}.screen{position:absolute;left:110px;top:180px;width:1080px;height:720px;background:#121212;border:5px solid #17365e;overflow:hidden}.screen img{position:absolute;max-width:none}.caption{position:absolute;left:230px;right:230px;top:953px;text-align:center;font-size:42px;line-height:1.25;color:#fff}.caption span{display:inline-block;background:#17365e;padding:10px 28px;border-radius:9px;max-width:100%}.banner{position:absolute;left:130px;right:130px;top:130px;font-size:36px;font-weight:700;text-align:center;color:#17365e;background:#ffdf7a;padding:15px}.demo{position:absolute;left:100px;top:242px;width:1720px;height:650px;object-fit:contain;background:#eef4fa;border:4px solid #17365e}.proof{position:absolute;left:145px;top:210px;width:1020px}.proof h2{font-size:60px;margin:0 0 34px}.proof p{font-size:42px;line-height:1.65;margin:10px 0}.note{font-size:28px!important;color:#3b5574}.ending{position:absolute;left:880px;top:190px;width:900px}.ending h2{font-size:58px;line-height:1.4;margin:0}.number{font-size:100px;font-weight:800;color:#2164b2;letter-spacing:3px;margin:25px 0}.ending p{font-size:38px;line-height:1.5}.ending .credits{font-size:25px;line-height:1.4}.endart{position:absolute;left:110px;top:300px;width:660px;height:440px;background-size:200% 200%;background-position:0% 100%;border:5px solid #17365e}.endart .bubble{left:4%;top:3%;width:35%;height:20%;display:grid;place-items:center;font-size:26px}'''
titles=['教程太长？把操作交给 Agent','交接动作 · 真机原速','两种账号 × 两种部署 = 四条路线','Agent 部署，你来扫码确认','QQ 中控 · 在 DSH 里直接管理','消息先落盘，再判断要不要回复','安静待命，还是自主参与？','跑没跑通，看验收','小肥鱼幼儿园一班 · 欢迎入学']
starts=[];t=0.0
for p in pars: starts.append(round(t,3));t+=p['duration']+0.45
total=round(t+4,3)
def clip(id,s,d,body,track=1):return f'<div id="{id}" class="clip" data-start="{s:.3f}" data-duration="{d:.3f}" data-track-index="{track}">{body}</div>'
def narrator(pose='welcome'):
    pose='welcome' if pose=='explain' else pose
    return f'<img class="speaker" src="assets/art/narrator-ref-{pose}.png"/>'
def aside(head,body,pose='welcome'):return f'<div class="aside"><h2>{esc(head)}</h2><p>{esc(body)}</p></div>'+narrator(pose)
def comic(sheet,q,words,head,body,pose='welcome'):
    if sheet=='cloud' and q==1:pose='scan'
    coords=[(4,5,39),(43,5,53),(5,4,44),(49,5,47)] if sheet=='handoff' else [(4,5,37),(55,5,40),(5,5,36),(57,6,38)]
    if sheet=='cloud':coords=[(6,7,38),(5,6,35),(7,6,34),(58,6,36)]
    x,y,w=coords[q];y+=3
    fn={'handoff':'handoff-comic-ref','cloud':'cloud-comic-ref','bot':'xiaofeiyu-comic'}[sheet]
    return f'<div class="panel" style="background-image:url(assets/art/{fn}.png);background-position:{q%2*100}% {q//2*100}%"><div class="bubble" style="left:{x}%;top:{y}%;width:{w}%">{esc(words)}</div></div>'+aside(head,body,pose)
def realshot(file,head,body,focus=False):
    style='width:1680px;left:-490px;top:-420px' if focus else 'height:720px;left:116px;top:0'
    return f'<div class="screen"><img src="assets/evidence/{file}.png" style="{style}"/></div>'+aside(head,body,'settings')
shotdata=[[('handoff', 0, '教程有点长呀。', '十几分钟\n二十几分钟', '把重复操作\n交给 Agent', 'overwhelmed'), ('handoff', 1, '这包，交给你！', '约 3 秒\n完成交接', '拖入交接包\n按下回车', 'welcome')], [], [], [('cloud', 0, '环境我来检查！', 'Agent 开工', '检查环境 · 安装依赖\n生成配置 · 接通模型', 'welcome'), ('cloud', 1, '扫码确认就好。', '手机确认', 'Agent 提示扫码\n你来确认登录', 'scan'), ('handoff', 3, '收到回复啦！', '消息验收', '发送测试消息\n确认收到回复', 'settings'), ('cloud', 2, '电脑关了也能聊。', '部署到云端', '云端持续运行\n随时参与聊天', 'welcome')], [], [('bot', 0, '先记下来！', '群消息落盘', '按群、按日期\n整理聊天记录', 'settings'), ('bot', 1, '安静听，也记着。', '记录与回复', '安静旁听\n也能保存文字', 'welcome'), ('bot', 2, '一起回顾吧。', '打开记录', '回顾大家聊了什么\n方便继续交流', 'welcome')], [('bot', 1, '叫到我，再接话！', '仅 @ 回复', '叫到她\n她再接话', 'welcome'), ('bot', 2, '我也来聊两句！', '自主参与', '发来新消息\n她就可以接上', 'welcome'), ('bot', 3, '缓一缓，不刷屏。', '冷却 + 上限', '调整回复频率\n保持聊天节奏', 'settings'), ('bot', 3, '先休息一下。', '群聊总开关', '随时开启\n随时休息', 'welcome')], [], []]
hosts=[];audios=[];captions=[];srt=[];timeline=[]
for i,p in enumerate(pars):
    sid=f'scene{i}';dur=p['duration']+0.45+(4 if i==8 else 0);parts=[];tweens=[]
    tag={1:'真机交接',2:'路线总览',4:'DSH 原生中控',7:'实测记录'}.get(i,'')
    shell=f'<div class="paper"></div><div class="rail"></div><div class="chapter">{titles[i]}</div><div class="tag">{tag}</div>'
    def add(s,d,body,k):
        ident=f'{sid}-shot{k}';parts.append(clip(ident,s,d,f'<div class="shot" id="{ident}-inner">{body}</div>'))
        if k and i!=1:tweens.append(f"tl.fromTo('#{ident}-inner .panel, #{ident}-inner .screen',{{x:32}},{{x:0,duration:.34,ease:'power3.out'}},{s});")
    if i==2:
        rows=[('官方 QQ bot','本地部署','云端部署'),('个人 QQ 小号','本地部署','云端部署')]
        cards=''.join(f'<div style="position:absolute;left:{150+c*530}px;top:{370+r*250}px;width:490px;height:210px;border:4px solid #2679d9;background:white;padding:28px;font-size:38px;line-height:1.6"><strong>{rows[r][0]}</strong><br>{rows[r][c+1]}</div>' for r in range(2) for c in range(2))
        body='<div style="position:absolute;left:150px;top:210px;font-size:43px;line-height:1.5">QQ 官方提供机器人接口<br>我们同时支持接入个人 QQ 小号</div>'+cards+aside('选好路线','告诉 Agent\n它就按路线开工','welcome')
        split=p['sentences'][2]['end']+0.25
        official='<div style="position:absolute;left:150px;top:240px;width:1010px;font-size:40px;line-height:1.7"><h2 style="font-size:56px;margin:0 0 30px">QQ 官方接入插件</h2><div style="font-family:monospace;font-size:40px;background:#dceeff;padding:20px">@tencent-connect/dsh-qqbot</div><p>① 插件 → 添加插件 → 安装并启动<br>② 设置 → QQ 机器人<br>③ 手机 QQ 扫码绑定</p><div style="font-size:25px;color:#3b5574">github.com/tencent-connect/dsh-qqbot</div></div>'+aside('官方 bot','在 DSH 里安装\n扫码连接','scan')
        add(0,split,official,0)
        add(split,dur-split,body,1)
    elif shotdata[i]:
        count=len(shotdata[i]);step=dur/count
        for k,args in enumerate(shotdata[i]):add(k*step,step,comic(*args),k)
    elif i==1:
        parts.append('<div class="banner">演示前：请为执行部署的本地 Agent 开启完全访问权限</div>')
        parts.append(f'<video id="handoff-real" class="clip demo" data-start="0" data-duration="4.2" data-track-index="2" src="assets/evidence/handoff.mp4" muted playsinline></video>')
        parts.append(clip('handoff-hold',4.2,dur-4.2,'<img class="demo" src="assets/evidence/handoff-sent.png"/>',2))
        parts.append('<div style="position:absolute;right:130px;top:250px;z-index:30;width:360px;background:#ffdf7a;border:5px solid #17365e;padding:20px;text-align:center"><div style="font-size:34px">交接计时</div><div id="handoff-timer" style="font-family:monospace;font-size:84px;font-weight:900">0.00s</div></div>')
    elif i==4:
        data=[('native-control-v013','原生插件页','在 DSH 内管理\n设置集中调整',False),('native-control-v013','总开关 / 落盘','选择要接入的群\n开启消息记录',True),('control-autonomous','切换对话模式','仅 @ / 自主参与\n按实际需要选择',True),('persona-ui','人格文件编辑','工作约定 · 人物设定\n预览后保存到工作区',False)]
        for k,args in enumerate(data):add(k*dur/4,dur/4,realshot(*args),k)
    elif i==7:
        proofs=[('部署工具已备齐','安装脚本 · 检查工具','测试用例 · 恢复步骤'),('个人小号接入','本地私聊 · 云端收发','实际消息往返通过'),('群聊功能验收','普通消息记录 · 仅 @ 回复','自主参与收到回复'),('交接给 Agent','按路线部署 · 检查 · 排错','你来确认账号和使用方式')]
        for k,(h,a,b) in enumerate(proofs):
            body=f'<div class="proof"><h2>{h}</h2><p>{a}</p><p>{b}</p></div>'+aside('已经跑通','部署与验收\n都有步骤可循','settings')
            add(k*dur/4,dur/4,body,k)
    else:
        body='<div class="endart"><div class="bubble">欢迎来玩！</div></div><div class="ending"><h2>AGENT 账号社会实验 QQ 群</h2><div class="number">1101639594</div><p>小肥鱼幼儿园一班<br>一起搭建、观察，也一起改进</p><p class="credits">配乐：Dan Salvato<br>Doki Doki Literature Club!<br>角色设定参考：zipzippipe</p></div>'
        body=body.replace('class="endart"','class="endart" style="background-image:url(assets/art/xiaofeiyu-comic.png)"')
        add(0,dur,body,0)
        tweens.append("tl.fromTo('.number',{scale:.85,opacity:0},{scale:1,opacity:1,duration:.6,ease:'back.out(1.3)'},3);")
    if i==1:
        for frame in range(109):
            tweens.append(f"tl.set('#handoff-timer',{{textContent:'{frame/30:.2f}s'}},{frame/30});")
    if i not in (1,8):
        for j,sentence in enumerate(p['sentences']):
            beat=sentence['start']
            while beat+0.34<sentence['end']:
                tilt=0.7 if j%2 else -0.7
                tweens.append(f"tl.fromTo('.speaker',{{y:0,rotation:0}},{{y:-7,rotation:{tilt},transformOrigin:'50% 85%',duration:.14,ease:'sine.out'}},{beat:.3f});")
                tweens.append(f"tl.to('.speaker',{{y:0,rotation:0,duration:.20,ease:'sine.inOut'}},{beat+.14:.3f});")
                beat+=1.1
    content=f'<template><style>{css}</style><div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080">{shell}{"".join(parts)}</div><script>const tl=gsap.timeline({{paused:true}});{"".join(tweens)}window.__timelines["{sid}"]=tl;</script></template>'
    (root/f'compositions/{sid}.html').write_text(content,encoding='utf-8')
    hosts.append(f'<div id="{sid}" class="clip" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{starts[i]}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>')
    audios.append(f'<audio id="voice{i}" class="clip" src="assets/audio/{p["id"]}.wav" data-start="{starts[i]}" data-duration="{p["duration"]}" data-track-index="3" data-volume="1" data-audio-group="voiceover"></audio>')
    for c in p['captions']:
        a=round(starts[i]+c['start'],3);b=round(starts[i]+c['end'],3)
        c['text']=c['text'].strip().strip('，,').strip()
        captions.append(clip(c['id'],a,b-a,f'<div class="caption"><span>{esc(c["text"])}</span></div>',1));srt.append((a,b,c['text']))
    timeline.append({'id':sid,'paragraph':p['id'],'start':starts[i],'duration':dur,'voiceDuration':p['duration']})
cap=f'<template><style>{css}</style><div id="root" data-composition-id="captions" data-width="1920" data-height="1080">{"".join(captions)}</div><script>window.__timelines["captions"]=gsap.timeline({{paused:true}});</script></template>'
(root/'compositions/captions.html').write_text(cap,encoding='utf-8')
hosts.append(f'<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{total}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:10"></div>')
lane=esc(json.dumps({'version':1,'lanes':[{'target':'volume','points':[{'t':0,'v':.3},{'t':total-4.5,'v':.3},{'t':total-3.6,'v':.7},{'t':total-1.5,'v':.7},{'t':total,'v':0}]}]}),quote=True)
audios.append(f'<audio id="music" class="clip" src="assets/audio/music-bed.wav" data-start="0" data-duration="{total}" data-track-index="4" data-volume="1" data-fade-in=".3" data-fade-out="1.5" data-automation="{lane}" data-audio-group="music"></audio>')
index=f'<!DOCTYPE html><html lang="zh-CN" data-composition-variables=\'[{{"id":"accent","type":"color","label":"强调色","default":"#2679d9"}}]\'><head><meta charset="utf-8"><style>html,body{{margin:0;width:1920px;height:1080px;background:#f5faff;overflow:hidden}}#root{{position:relative;width:1920px;height:1080px}}.clip{{position:absolute;inset:0}}</style><script src="assets/vendor/gsap.min.js"></script></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">{"".join(hosts+audios)}</div><script>window.__timelines=window.__timelines||{{}};window.__timelines.main=gsap.timeline({{paused:true}});</script></body></html>'
# JSON literal is emitted separately to avoid f-string interpretation.
index=index.replace("data-composition-variables='[{'id'", "data-composition-variables='[{\"id\"")
(root/'index.html').write_text(index,encoding='utf-8')
def stamp(x):
    msec=round(x*1000);return f'{msec//3600000:02}:{msec//60000%60:02}:{msec//1000%60:02},{msec%1000:03}'
(root/'subtitles.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,s) in enumerate(srt))+'\n',encoding='utf-8')
(root/'timeline.json').write_text(json.dumps({'duration':total,'scenes':timeline,'captions':len(srt)},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'duration':total,'scenes':len(pars),'captions':len(srt)}))


