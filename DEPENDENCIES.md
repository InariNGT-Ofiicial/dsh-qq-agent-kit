# 依赖与复现边界

## QQ 接入及中控

- Node.js：项目声明 >=24；云端已验收版本 24.21.0。
- DSH：@deepseek-ai/dsh 0.2.1-rc.2。
- js-yaml：4.3.2。
- NapCat：云端已验收 4.18.41；QQ 客户端及登录确认由使用者自行配置。
- Docker、Linux systemd、OpenSSH：云端部署和隔离服务管理所需。
- Windows PowerShell：本地 Agent 编排脚本所需。
- 原生中控插件：plugins/qq-control/package.json 为准确版本来源。

JavaScript 间接依赖以根目录与 vendor/package-lock.json 为准；优先 npm ci，不漂移安装版本。第三方 bridge 许可位于 vendor/LICENSE.qq-bridge。

## 发布视频

- HyperFrames 0.8.209；Node.js、Chromium（由渲染工具管理）、FFmpeg。
- GSAP：工程 assets/vendor 中的实际文件为准。
- Noto Sans SC：字体及 OFL 许可随工程提供。
- 配音生产：本地 CosyVoice2、晓伊 A3 参考音色；模型权重和参考录音不分发。
- 字幕对齐：本地 faster-whisper / small；不需要在观看或运行 QQ 插件时安装。
- 立绘与漫画：Codex 内置 image_gen，本期新绘；生成不属于运行时依赖。
- 配乐：用户提供 MP3，音乐原件不推送 GitHub。

密钥、登录态、SSH 私钥、人格快照及原始桌面录屏均不属于分发包。Agent 需与用户沟通提供自己的账号、模型凭据和授权测试范围。首次扫码、风控恢复和实际消息收件验收由人类完成。
