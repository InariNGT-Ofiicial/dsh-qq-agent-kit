# 发布视频工程

画幅 1920×1080，30 fps，总时长 172.05 秒。使用 HyperFrames 0.8.209，入口 index.html。运行 npm run dev 预览，npm run check 校验，npm run render -- --quality delivery --fps 30 渲染。

这里保存时间线、字幕、版式及本期原创漫画和全新讲解立绘。为了不混入用户音乐与私人录屏，音频和操作证据文件由本地交付工程提供，不随 Git 仓库发布。仅克隆仓库不能完整复现带配音的视频。

补充媒体目录：assets/audio/Q00.wav 至 Q08.wav、music-bed.wav；assets/evidence/handoff.mp4、handoff-sent.png、native-control-v013.png、control-autonomous.png、persona-ui.png。音频时长和场景起点见 timeline.json。实录不得替换成虚构的操作成功画面。

music-bed.wav 来源为用户提供的 Dan Salvato — Doki Doki Literature Club!，不代表本仓库授予该音乐的再分发许可。字体许可随 assets/fonts 提供。晓伊 A3 语音模型和参考音频不在仓库内。

DS娘四款透明半身立绘为本期重新绘制，文件名前缀 narrator-ref-；不复用以前发布视频的讲解贴图。小肥鱼角色按用户提供设定绘制，钢盆造型用于群聊暂停等漫画场景。

第二版调整见 REVISION2.md。源码包包含版式、字幕、构建入口及角色素材；音频与操作证据由本地工程持有，未包含在此源码包中。角色设定参考：zipzippipe。
